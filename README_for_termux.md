# 📌 WebTelegramUserBotManager on Termux

Panduan instalasi dan menjalankan **WebTelegramUserBotManager** di **Termux** dengan memisahkan service ke dalam 4 session berbeda (Frontend, Backend, Python Service, dan Redis).

---

## 🔹 1. Clone Repository

```bash
pkg update -y && pkg upgrade -y
pkg install -y git

cd ~
git clone https://github.com/ululazmi18/webTelegramUserBotManager.git
cd webTelegramUserBotManager
```

---

## 🔹 2. Beri Izin Eksekusi Script

```bash
chmod +x setup_termux_session_1.sh
chmod +x setup_termux_session_2.sh
chmod +x setup_termux_session_3.sh
chmod +x setup_termux_session_4.sh
```

---

## 🔹 3. Jalankan Service di 4 Session Termux

> ⚠️  **Wajib buka 4 session berbeda di Termux** , karena setiap service jalan di port masing-masing.

### ✅ Session 1: Redis Server (Port 6379)

```bash
cd ~/webTelegramUserBotManager
bash setup_termux_session_1.sh
```

Redis akan berjalan di port  **6379** .

---

### ✅ Session 2: Python Service (Port 5000)

```bash
cd ~/webTelegramUserBotManager
bash setup_termux_session_2.sh
```

Service jalan di:

👉 [http://localhost:5000](http://localhost:5000/)

---

### ✅ Session 3: Backend (Node.js/Express.js, Port 3000)

```bash
cd ~/webTelegramUserBotManager
bash setup_termux_session_3.sh
```

API jalan di:

👉 [http://localhost:3000](http://localhost:3000/)

---

### ✅ Session 4: Frontend (React/Next.js, Port 3001)

```bash
cd ~/webTelegramUserBotManager
bash setup_termux_session_4.sh
```

Akses via browser di:

👉 [http://localhost:3001](http://localhost:3001/)

---

## 🔹 4. Ringkasan Port & Service

| Session | Service           | Port | Jalankan di Termux                 |
| ------- | ----------------- | ---- | ---------------------------------- |
| 1       | Frontend (React)  | 3001 | `bash setup_termux_session_1.sh` |
| 2       | Backend (Node.js) | 3000 | `bash setup_termux_session_2.sh` |
| 3       | Python Service    | 5000 | `bash setup_termux_session_3.sh` |
| 4       | Redis Server      | 6379 | `bash setup_termux_session_4.sh` |

---

## 🔹 5. Sumber

📂 Repo: [WebTelegramUserBotManager](https://github.com/ululazmi18/webTelegramUserBotManager.git)
