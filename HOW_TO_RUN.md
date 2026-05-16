# How to Run Deep Shelem

This is a full-stack real-time multiplayer card game. It uses **Express**, **Socket.io**, and **Vite**.

## راهنمای اجرا (Local Development)

1. **نصب وابستگی‌ها**:
   ```bash
   npm install
   ```
2. **اجرای سرور توسعه**:
   ```bash
   npm run dev
   ```
   برنامه در آدرس `http://localhost:3000` در دسترس خواهد بود.

## اجرا روی سرور واقعی (VPS)

1. **ساخت فایل‌های نهایی**:
   ```bash
   npm run build
   ```
2. **شروع سرور**:
   ```bash
   npm run start
   ```

## قوانین بازی (Shelem Rules)

- **هدف**: رسیدن به امتیاز ۶۶۰.
- **توزیع ورق**: به هر بازیکن ۱۲ ورق داده می‌شود و ۴ ورق در وسط می‌ماند.
- **تعهد (بیدینگ)**: کمترین امتیاز ۱۰۰ است. حاکم کسی است که بیشترین امتیاز را بخواند.
- **حکم**: حاکم ۴ ورق وسط را برداشته، ۴ ورق دلخواه زمین می‌گذارد و حکم را تعیین می‌کند.
- **شمارش امتیاز**: هر دست ۵ امتیاز، هر ۵ لو ۵ امتیاز، هر ۱۰ لو ۱۰ امتیاز و هر آس ۱۰ امتیاز دارد. مجموع کل ۱۶۵ امتیاز است.

## ویژگی‌ها (Features)

- **Multiplayer**: امکان بازی ۴ نفره آنلاین.
- **Real-time**: استفاده از Socket.io برای آپدیت‌های آنی.
- **Local Database**: ذخیره نتایج در فایل `game_history.json`.

---

## Deployment Tips

- **Environment Variables**: Ensure `NODE_ENV=production` is set for optimal performance.
- **Reverse Proxy**: If using Nginx, make sure to configure it to handle WebSocket upgrades.
- **Persistence**: The `game_history.json` file is where game data is stored. For long-term production, consider migrating to a more robust database like PostgreSQL or Firestore.
