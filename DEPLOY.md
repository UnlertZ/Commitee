# 🚀 คู่มือการ Deploy - Safety Committee Website

## ขั้นตอนการติดตั้ง

### Step 1: ติดตั้ง Node.js
ดาวน์โหลดจาก [nodejs.org](https://nodejs.org/) (เลือก LTS version)

---

### Step 2: ติดตั้ง Wrangler CLI + Login Cloudflare
```bash
npm install -g wrangler
wrangler login
# Browser จะเปิดขึ้นมา ให้ Login Cloudflare Account
```

---

### Step 3: สร้าง D1 Database
```bash
cd worker
wrangler d1 create jdecommitee
```
คัดลอก `database_id` ที่ได้ ไปใส่ใน `worker/wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "jdecommitee"
database_id = "PASTE_YOUR_ID_HERE"  # <-- ใส่ตรงนี้
```

---

### Step 4: รัน Database Migration
```bash
cd worker
wrangler d1 execute jdecommitee --file=./schema.sql
```
> ขั้นตอนนี้จะสร้าง Table ทั้งหมด + สร้าง Super Admin account

---

### Step 5: ติดตั้ง Dependencies

```bash
# Backend Worker
cd worker
npm install

# Frontend
cd ../frontend
npm install
```

---

### Step 6: รัน Development Server

**Terminal 1 - Backend API (Port 8787):**
```bash
cd worker
wrangler dev
```

**Terminal 2 - Frontend (Port 3000):**
```bash
cd frontend
npm run dev
```

เปิด Browser ไปที่ http://localhost:3000

---

### Default Login
| Field | Value |
|-------|-------|
| Username | `superadmin` |
| Password | `Admin@1234` |
| Permission | P2 - Super Admin |

> ⚠️ **เปลี่ยนรหัสผ่านทันทีหลัง login ครั้งแรก!**

---

## Production Deploy

### Deploy Worker ไป Cloudflare
```bash
cd worker

# เพิ่ม JWT_SECRET ใน Cloudflare Secret
wrangler secret put JWT_SECRET
# พิมพ์ random string ยาวๆ แล้วกด Enter

# Deploy
wrangler deploy
```

### Deploy Frontend ไป Cloudflare Pages
```bash
cd frontend

# สร้าง .env.production
echo "NEXT_PUBLIC_API_URL=https://jdecommitee-worker.YOUR_SUBDOMAIN.workers.dev" > .env.production

npm run build

# Deploy ผ่าน Cloudflare Pages Dashboard หรือ CLI
wrangler pages deploy .next/static
```

---

## โครงสร้างไฟล์
```
shecommitee/
├── worker/                    # Cloudflare Workers API
│   ├── src/
│   │   ├── index.ts           # Entry point + CORS
│   │   ├── middleware/
│   │   │   └── auth.ts        # JWT Auth middleware
│   │   ├── routes/
│   │   │   ├── auth.ts        # Login/Register
│   │   │   ├── users.ts       # User management (P2)
│   │   │   ├── committee-days.ts  # Committee day CRUD
│   │   │   ├── safety-issues.ts   # Issue CRUD + resolve
│   │   │   └── export.ts      # Export data
│   │   └── utils/
│   │       ├── jwt.ts         # JWT sign/verify (Web Crypto)
│   │       └── password.ts    # PBKDF2 password hash
│   ├── schema.sql             # D1 Database schema
│   ├── wrangler.toml          # Cloudflare config
│   └── package.json
│
└── frontend/                  # Next.js 15 App
    └── src/
        ├── app/
        │   ├── (auth)/
        │   │   ├── login/     # หน้า Login
        │   │   └── register/  # หน้า Register
        │   └── (main)/
        │       ├── dashboard/     # Dashboard + Stats
        │       ├── committee-days/ # จัดการวันตรวจ
        │       ├── submit-issue/   # ส่งเรื่อง
        │       ├── issues/         # รายการทั้งหมด + Resolve
        │       ├── export/         # Export Excel/ZIP
        │       └── users/          # จัดการ User (P2)
        ├── components/
        │   ├── layout/
        │   │   └── sidebar.tsx    # Navigation Sidebar
        │   └── ui/                # shadcn/ui components
        ├── context/
        │   └── auth-context.tsx   # Auth state
        ├── hooks/
        │   └── use-toast.ts      # Toast notifications
        └── lib/
            ├── api.ts            # API client functions
            └── utils.ts          # Thai date formatting, helpers
```

---

## Troubleshooting

### ❌ `wrangler: command not found`
```bash
npm install -g wrangler
# หรือ
npx wrangler dev
```

### ❌ CORS Error
แก้ไข `worker/wrangler.toml` ให้ `FRONTEND_URL` ตรงกับ URL จริง

### ❌ Image ใหญ่เกิน D1
รูปจะถูก compress อัตโนมัติเป็น max 1200px / JPEG 75% quality
ถ้ายังมีปัญหา พิจารณาย้ายไป Cloudflare R2
