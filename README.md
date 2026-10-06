# Safety Committee System (jdecommitee)

ระบบจัดการคณะกรรมการความปลอดภัย — Cloudflare Worker (API) + Cloudflare Pages (Frontend)

---

## โครงสร้าง

```
Commitee/
├── frontend/        ← Next.js 15 (Static Export → Cloudflare Pages)
├── worker/          ← Hono.js (Cloudflare Workers API)
└── .gitignore
```

---

## Cloudflare Resources

| Resource | Name | ID / URL |
|----------|------|----------|
| D1 Database | `jdecommitee` | `832147c6-2418-4986-a48d-75be67132d41` |
| R2 Bucket | `r2commitee` | `https://1b94436b2a20e6311d5f6e5fc3174c6e.r2.cloudflarestorage.com/r2commitee` |

---

## Deploy ขั้นตอน

### 1️⃣ Deploy Worker (Cloudflare Workers)

```bash
cd worker
npm install
npx wrangler deploy
```

> ⚠️ **สำคัญ**: หลัง deploy Worker แล้ว ให้ไปตั้ง Secret ใน Cloudflare Dashboard:
> - Workers & Pages → `jdecommitee-worker` → Settings → Variables
> - เพิ่ม **Secret**: `JWT_SECRET` = (random string ยาวๆ เช่น 64 chars)

### 2️⃣ Migrate Database Schema

```bash
cd worker
# Remote (production)
npx wrangler d1 execute jdecommitee --remote --file=./schema.sql

# Local (dev)
npx wrangler d1 execute jdecommitee --local --file=./schema.sql
```

### 3️⃣ Deploy Frontend (Cloudflare Pages)

**วิธีที่ 1: ผ่าน GitHub (แนะนำ)**
1. Push โค้ดขึ้น GitHub
2. ไปที่ Cloudflare Dashboard → Pages → Create a project → Connect to Git
3. เลือก repo → ตั้งค่า:
   - **Framework preset**: Next.js (Static HTML Export)
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Build output directory**: `frontend/out`
   - **Root directory**: `/` (root ของ repo)
4. เพิ่ม Environment Variables:
   - `NEXT_PUBLIC_API_URL` = `https://jdecommitee-worker.<your-subdomain>.workers.dev`
5. กด **Save and Deploy**

**วิธีที่ 2: Manual (Wrangler)**
```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=https://jdecommitee-worker.<subdomain>.workers.dev npm run build
npx wrangler pages deploy out --project-name=jdecommitee
```

### 4️⃣ อัพเดต FRONTEND_URL ใน Worker

หลังได้ URL ของ Pages (เช่น `https://jdecommitee.pages.dev`):
- ไปที่ Cloudflare Dashboard → Workers → `jdecommitee-worker` → Settings → Variables
- อัพเดต `FRONTEND_URL` = `https://jdecommitee.pages.dev`

---

## บัญชีเริ่มต้น (Default Admin)

| Field | Value |
|-------|-------|
| Username | `superadmin` |
| Password | `Admin@1234` |
| Permission | P2 (Super Admin) |

> ⚠️ **เปลี่ยนรหัสผ่านทันทีหลัง login ครั้งแรก!**

---

## Environment Variables

### Worker (wrangler.toml + Cloudflare Dashboard)
| Variable | ค่า | วิธีตั้ง |
|----------|-----|---------|
| `JWT_SECRET` | Random string ยาว 64+ chars | Dashboard Secret |
| `FRONTEND_URL` | URL ของ Cloudflare Pages | wrangler.toml หรือ Dashboard |

### Frontend (Cloudflare Pages Dashboard)
| Variable | ค่า |
|----------|-----|
| `NEXT_PUBLIC_API_URL` | URL ของ Worker เช่น `https://jdecommitee-worker.xxx.workers.dev` |
