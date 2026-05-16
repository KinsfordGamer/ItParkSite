#!/bin/bash
# ─── Tez yangilash skripti (to'liq deploy emas) ──────────────────────────────
# Git dan so'nggi o'zgarishlarni tortib, servisni qayta ishga tushiradi
# Ishlatish: bash update.sh

set -e

PROJECT_DIR="/home/ubuntu/markaz_CRM"
BACKEND_DIR="$PROJECT_DIR/backend_python"
CLIENT_DIR="$PROJECT_DIR/client"
SERVICE_NAME="crm-backend"

echo "======================================================"
echo " CRM Tez Yangilash"
echo "======================================================"

# ─── 1. Git pull ──────────────────────────────────────────────────────────────
echo ""
echo "=== 1. So'nggi o'zgarishlarni yuklab olish ==="
cd "$PROJECT_DIR"
git pull origin main || git pull origin master
echo "✅ Kod yangilandi"

# ─── 2. Backend yangilash ─────────────────────────────────────────────────────
echo ""
echo "=== 2. Backend yangilash ==="
cd "$BACKEND_DIR"
source venv/bin/activate
pip install -r requirements.txt -q
echo "✅ Python kutubxonalar yangilandi"

# ─── 3. Frontend build ────────────────────────────────────────────────────────
echo ""
echo "=== 3. Frontend build ==="
if [ -f "$CLIENT_DIR/package.json" ]; then
    cd "$CLIENT_DIR"
    npm install -q
    npm run build
    echo "✅ Frontend build tayyor"
fi

# ─── 4. Servisni qayta ishga tushirish ────────────────────────────────────────
echo ""
echo "=== 4. Backend servisni qayta ishga tushirish ==="
sudo systemctl restart "$SERVICE_NAME"
sleep 3

if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "✅ Servis muvaffaqiyatli ishga tushdi"
else
    echo "❌ Servis ishlamadi!"
    sudo journalctl -u "$SERVICE_NAME" --no-pager -n 30
    exit 1
fi

# ─── 5. Health check ──────────────────────────────────────────────────────────
sleep 2
if curl -sf http://127.0.0.1:5000/api/health > /dev/null; then
    echo "✅ API javob bermoqda"
    curl -s http://127.0.0.1:5000/api/health | python3 -m json.tool 2>/dev/null || true
else
    echo "⚠️  API hali tayyor emas"
    sudo journalctl -u "$SERVICE_NAME" --no-pager -n 15
fi

echo ""
echo "======================================================"
echo "✅ Yangilash tugadi!"
echo "   Loglar: sudo journalctl -u $SERVICE_NAME -f"
echo "======================================================"
