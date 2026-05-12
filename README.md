# IT Park Surxondaryo CRM

Premium akademiya boshqaruv tizimi — IT Park Surxondaryo uchun.

## Texnologiyalar

**Frontend:** React + TypeScript + Vite + Tailwind CSS  
**Backend:** Node.js + Express + MongoDB  
**Auth:** JWT  

## Ishga tushirish

### Talablar
- Node.js >= 18
- MongoDB (lokal yoki Atlas)

### O'rnatish

```bash
# Root papkada
cd server && npm install
cd ../client && npm install
```

### Muhit o'zgaruvchilari

`server/.env` fayl yarating:
```env
MONGO_URI=mongodb://localhost:27017/markaz_crm
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=30d
NODE_ENV=development
PORT=5000
```

### Ishga tushirish

```bash
# Backend (server papkasida)
npm run dev

# Frontend (client papkasida)
npm run dev
```

### Production Build

```bash
# Client build
cd client && npm run build

# Serverni production rejimida ishga tushirish
cd server
NODE_ENV=production npm start
```

## Xususiyatlar

- 👥 Talabalar boshqaruvi
- 👨‍🏫 O'qituvchilar va oyliklar
- 💰 To'lovlar va qarzdorlar
- 📅 Davomat nazorati
- 📊 Dashboard va hisobotlar
- 🌐 Ko'p tilli (UZ / RU / EN)
- 🌙 Dark / Light mode
- 🔐 Role-based access control
