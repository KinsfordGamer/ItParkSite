#!/bin/bash
# ─── AWS EC2 Deploy Script for Python FastAPI Backend ─────────────────────────
# Run this on your AWS EC2 instance (Ubuntu/Amazon Linux)

set -e

PROJECT_DIR="/home/ubuntu/markaz_CRM"
BACKEND_DIR="$PROJECT_DIR/backend_python"
SERVICE_NAME="crm-backend"

echo "=== 1. Updating packages ==="
sudo apt-get update -y
sudo apt-get install -y python3 python3-pip python3-venv nginx

echo "=== 2. Setting up Python virtual environment ==="
cd $BACKEND_DIR
python3 -m venv venv
source venv/bin/activate

echo "=== 3. Installing dependencies ==="
pip install --upgrade pip
pip install -r requirements.txt

echo "=== 4. Copying .env file (make sure it exists!) ==="
if [ ! -f "$BACKEND_DIR/.env" ]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo "⚠️  Please edit .env file with your actual values!"
fi

echo "=== 5. Creating systemd service ==="
sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null <<EOF
[Unit]
Description=Academy CRM FastAPI Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=$BACKEND_DIR
Environment="PATH=$BACKEND_DIR/venv/bin"
EnvironmentFile=$BACKEND_DIR/.env
ExecStart=$BACKEND_DIR/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:5000 --timeout 120 --access-logfile /var/log/$SERVICE_NAME-access.log --error-logfile /var/log/$SERVICE_NAME-error.log
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

echo "=== 6. Starting service ==="
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl restart $SERVICE_NAME

echo "=== 7. Configuring Nginx ==="
sudo tee /etc/nginx/sites-available/$SERVICE_NAME > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    client_max_body_size 20M;

    location /api/ {
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
    }

    location / {
        root $PROJECT_DIR/client/dist;
        try_files \$uri \$uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/$SERVICE_NAME /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo ""
echo "✅ Deployment complete!"
echo "🔗 Service status: sudo systemctl status $SERVICE_NAME"
echo "📋 Logs: sudo journalctl -u $SERVICE_NAME -f"
