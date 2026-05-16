#!/bin/bash
set -e

echo "========================================"
echo " 1. ESKI SERVISLARNI TO'XTATISH"
echo "========================================"
sudo systemctl stop crm-backend 2>/dev/null || true
sudo systemctl disable crm-backend 2>/dev/null || true
sudo systemctl stop nginx 2>/dev/null || true
echo "Servislar to'xtatildi"

echo "========================================"
echo " 2. ESKI FAYLLARNI TOZALASH"
echo "========================================"
sudo rm -rf /home/ubuntu/ItParkSite
sudo rm -rf /home/ubuntu/app
sudo rm -rf /home/ubuntu/venv
sudo rm -f /etc/systemd/system/crm-backend.service
sudo rm -f /etc/nginx/sites-enabled/crm
sudo rm -f /etc/nginx/sites-available/crm
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl daemon-reload
echo "Eski fayllar tozalandi"

echo "========================================"
echo " 3. YANGI REPO CLONE"
echo "========================================"
cd /home/ubuntu
git clone https://github.com/KinsfordGamer/ItParkSite.git ItParkSite
cd ItParkSite
echo "Repo mazmuni:"
ls -la

echo "========================================"
echo " 4. PYTHON ENVIRONMENT"
echo "========================================"
cd /home/ubuntu/ItParkSite/backend_python

# Fix requirements.txt conflict before installing
cat > requirements.txt << 'REQEOF'
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
motor>=3.3.2
pydantic>=2.0.0
pydantic-settings>=2.1.0
python-dotenv>=1.0.1
passlib[bcrypt]>=1.7.4
python-jose[cryptography]>=3.3.0
python-multipart>=0.0.9
bcrypt>=4.1.0
email-validator>=2.1.0
gunicorn>=21.2.0
REQEOF

python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel -q
pip install -r requirements.txt -q
echo "Python env tayyor"

echo "========================================"
echo " 5. .env FAYLI YARATISH"
echo "========================================"
cat > /home/ubuntu/ItParkSite/backend_python/.env << 'ENVEOF'
MONGO_URI=mongodb://localhost:27017/academy-crm
JWT_SECRET=itpark_surxondaryo_super_secret_key_2024_xyz
PORT=5000
NODE_ENV=production
CLIENT_URL=http://13.49.234.95
ENVEOF
echo ".env yaratildi"

echo "========================================"
echo " 6. NODE.JS TEKSHIRISH"
echo "========================================"
if ! command -v node &> /dev/null; then
    echo "Node.js o'rnatilmoqda..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs -q
fi
node --version
npm --version

echo "========================================"
echo " 7. FRONTEND BUILD"
echo "========================================"
cd /home/ubuntu/ItParkSite/client

# Patch vite.config.ts to avoid ManualChunks and ESM __dirname error
cat > vite.config.ts << 'VITEOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve('src'),
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
  }
})
VITEOF

npm install --legacy-peer-deps -q
npm install react-is -q
npm run build
echo "Frontend build tayyor"
ls dist/

echo "========================================"
echo " 8. SYSTEMD SERVICE"
echo "========================================"
sudo tee /etc/systemd/system/crm-backend.service > /dev/null << 'SVCEOF'
[Unit]
Description=Crm Backend (FastAPI)
After=network.target mongod.service
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/ItParkSite/backend_python
Environment="PATH=/home/ubuntu/ItParkSite/backend_python/venv/bin:/usr/local/bin:/usr/bin:/bin"
EnvironmentFile=/home/ubuntu/ItParkSite/backend_python/.env
ExecStart=/home/ubuntu/ItParkSite/backend_python/venv/bin/gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:5000 \
    --timeout 120 \
    --keep-alive 5 \
    --access-logfile /var/log/crm-access.log \
    --error-logfile /var/log/crm-error.log \
    --log-level info
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVCEOF

sudo touch /var/log/crm-access.log /var/log/crm-error.log
sudo chown ubuntu:ubuntu /var/log/crm-*.log
echo "Systemd service yaratildi"

echo "========================================"
echo " 9. NGINX SOZLASH"
echo "========================================"
sudo tee /etc/nginx/sites-available/itpark > /dev/null << 'NGEOF'
server {
    listen 80;
    server_name 13.49.234.95 _;

    client_max_body_size 20M;

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }

    location /assets/ {
        root /home/ubuntu/ItParkSite/client/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location / {
        root /home/ubuntu/ItParkSite/client/dist;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, no-cache";
    }
}
NGEOF

sudo ln -sf /etc/nginx/sites-available/itpark /etc/nginx/sites-enabled/
sudo nginx -t
echo "Nginx tayyor"

echo "========================================"
echo " 10. SERVISLARNI ISHGA TUSHIRISH"
echo "========================================"
sudo systemctl daemon-reload
sudo systemctl enable crm-backend
sudo systemctl start crm-backend
sudo systemctl start nginx
sudo systemctl enable nginx

sleep 4
if sudo systemctl is-active --quiet crm-backend; then
    echo "Backend ishlamoqda!"
else
    echo "Backend xatosi:"
    sudo journalctl -u crm-backend --no-pager -n 20
    exit 1
fi

echo "========================================"
echo " 11. HEALTH CHECK"
echo "========================================"
sleep 2
curl -sf http://127.0.0.1:5000/api/health && echo "" || echo "API hali tayyor emas"

echo ""
echo "========================================"
echo "  DEPLOY TUGADI!"
echo "  Sayt: http://13.49.234.95"
echo "  API:  http://13.49.234.95/api/health"
echo "========================================"
