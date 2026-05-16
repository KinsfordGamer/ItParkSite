#!/bin/bash
# ─── AWS EC2 Deploy Script (Ubuntu 24 LTS) ────────────────────────────────────
# Ishlatish: bash deploy.sh [sizning_domen_yoki_IP]
# Misol:     bash deploy.sh itparksurhondaryocrm.one

set -e  # Xato bo'lsa to'xta

DOMAIN="${1:-_}"                              # Argument berilmasa wildcard
PROJECT_DIR="/home/ubuntu/markaz_CRM"
BACKEND_DIR="$PROJECT_DIR/backend_python"
CLIENT_DIR="$PROJECT_DIR/client"
SERVICE_NAME="crm-backend"
PYTHON_BIN="/usr/bin/python3"

echo "======================================================"
echo " CRM Deploy Script — Ubuntu 24 LTS"
echo " Domain: $DOMAIN"
echo " Project: $PROJECT_DIR"
echo "======================================================"

# ─── 1. Tizim paketlarini yangilash ──────────────────────────────────────────
echo ""
echo "=== 1. Tizim paketlarini yangilash ==="
sudo apt-get update -y
sudo apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    nginx \
    curl \
    git \
    build-essential

# Node.js 20 LTS (agar frontend build kerak bo'lsa)
if ! command -v node &> /dev/null; then
    echo "Node.js o'rnatilmoqda..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# ─── 2. Python virtual environment ───────────────────────────────────────────
echo ""
echo "=== 2. Python virtual environment ==="
cd "$BACKEND_DIR"

# Eski venv ni tozalash (muammoli bo'lsa)
if [ -d "venv" ]; then
    echo "Eski venv tozalanmoqda..."
    rm -rf venv
fi

$PYTHON_BIN -m venv venv
source venv/bin/activate

# ─── 3. Dependencies o'rnatish ────────────────────────────────────────────────
echo ""
echo "=== 3. Dependencies o'rnatish ==="
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

# ─── 4. .env fayli ───────────────────────────────────────────────────────────
echo ""
echo "=== 4. .env fayli tekshirish ==="
if [ ! -f "$BACKEND_DIR/.env" ]; then
    if [ -f "$BACKEND_DIR/.env.example" ]; then
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    else
        cat > "$BACKEND_DIR/.env" << ENVEOF
MONGO_URI=mongodb://localhost:27017/academy-crm
JWT_SECRET=$(openssl rand -hex 32)
PORT=5000
NODE_ENV=production
CLIENT_URL=http://${DOMAIN}
ENVEOF
    fi
    echo "⚠️  MUHIM: $BACKEND_DIR/.env faylini to'g'ri sozlang!"
    echo "    nano $BACKEND_DIR/.env"
fi

# Production environment ni o'rnatish
if ! grep -q "NODE_ENV=production" "$BACKEND_DIR/.env"; then
    # NODE_ENV ni production ga o'zgartirish
    sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' "$BACKEND_DIR/.env" || \
    echo "NODE_ENV=production" >> "$BACKEND_DIR/.env"
fi

# CLIENT_URL ni yangilash (agar _ bo'lmasa)
if [ "$DOMAIN" != "_" ]; then
    if grep -q "^CLIENT_URL=" "$BACKEND_DIR/.env"; then
        sed -i "s|^CLIENT_URL=.*|CLIENT_URL=http://${DOMAIN},https://${DOMAIN}|" "$BACKEND_DIR/.env"
    else
        echo "CLIENT_URL=http://${DOMAIN},https://${DOMAIN}" >> "$BACKEND_DIR/.env"
    fi
fi

# ─── 5. Frontend build ────────────────────────────────────────────────────────
echo ""
echo "=== 5. Frontend build ==="
if [ -f "$CLIENT_DIR/package.json" ]; then
    cd "$CLIENT_DIR"
    npm install --production=false
    VITE_API_URL="" npm run build
    echo "✅ Frontend build muvaffaqiyatli"
else
    echo "⚠️  Client papka topilmadi, skip qilinmoqda"
fi

# ─── 6. Systemd service ───────────────────────────────────────────────────────
echo ""
echo "=== 6. Systemd service yaratish ==="
sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null << EOF
[Unit]
Description=Academy CRM FastAPI Backend
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=$BACKEND_DIR
Environment="PATH=$BACKEND_DIR/venv/bin:/usr/local/bin:/usr/bin:/bin"
EnvironmentFile=$BACKEND_DIR/.env
ExecStart=$BACKEND_DIR/venv/bin/gunicorn app.main:app \\
    --workers 4 \\
    --worker-class uvicorn.workers.UvicornWorker \\
    --bind 127.0.0.1:5000 \\
    --timeout 120 \\
    --keepalive 5 \\
    --max-requests 1000 \\
    --max-requests-jitter 100 \\
    --access-logfile /var/log/${SERVICE_NAME}-access.log \\
    --error-logfile /var/log/${SERVICE_NAME}-error.log \\
    --log-level info
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

[Install]
WantedBy=multi-user.target
EOF

# Log fayllarini yaratish
sudo touch /var/log/${SERVICE_NAME}-access.log /var/log/${SERVICE_NAME}-error.log
sudo chown ubuntu:ubuntu /var/log/${SERVICE_NAME}-*.log

echo "✅ Systemd service yaratildi"

# ─── 7. Nginx sozlash ────────────────────────────────────────────────────────
echo ""
echo "=== 7. Nginx sozlash ==="
sudo tee /etc/nginx/sites-available/$SERVICE_NAME > /dev/null << EOF
# Rate limiting
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=30r/s;

server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 20M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # ── API so'rovlar ──────────────────────────────────────────────────
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 120s;

        # CORS preflight
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type';
            add_header 'Content-Length' 0;
            return 204;
        }
    }

    # ── Frontend static fayllar ────────────────────────────────────────
    location /assets/ {
        root $CLIENT_DIR/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location / {
        root $CLIENT_DIR/dist;
        try_files \$uri \$uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, no-cache";
    }
}
EOF

# Eski default ni o'chirish
sudo ln -sf /etc/nginx/sites-available/$SERVICE_NAME /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx konfiguratsiyani tekshirish
sudo nginx -t
echo "✅ Nginx sozlandi"

# ─── 8. Servislarni qayta ishga tushirish ────────────────────────────────────
echo ""
echo "=== 8. Servislarni qayta ishga tushirish ==="
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl restart $SERVICE_NAME
sudo systemctl restart nginx

# Status tekshirish
sleep 3
if sudo systemctl is-active --quiet $SERVICE_NAME; then
    echo "✅ Backend service ishlamoqda"
else
    echo "❌ Backend service ishlamadi! Log:"
    sudo journalctl -u $SERVICE_NAME --no-pager -n 30
    exit 1
fi

# ─── 9. Health check ─────────────────────────────────────────────────────────
echo ""
echo "=== 9. Health check ==="
sleep 2
if curl -sf http://127.0.0.1:5000/api/health > /dev/null; then
    echo "✅ API javob bermoqda"
else
    echo "⚠️  API hali tayyor emas, log tekshiring:"
    sudo journalctl -u $SERVICE_NAME --no-pager -n 20
fi

echo ""
echo "======================================================"
echo "✅ Deploy muvaffaqiyatli yakunlandi!"
echo ""
echo "📋 Foydali buyruqlar:"
echo "   Holat:  sudo systemctl status $SERVICE_NAME"
echo "   Loglar: sudo journalctl -u $SERVICE_NAME -f"
echo "   Nginx:  sudo nginx -t && sudo systemctl reload nginx"
echo ""
if [ "$DOMAIN" != "_" ]; then
    echo "🌐 Sayt: http://$DOMAIN"
    echo "📖 API:  http://$DOMAIN/api/health"
fi
echo "======================================================"
