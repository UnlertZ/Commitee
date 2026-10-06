# 🦺 Safety Committee Website (jdecommitee)

เว็บไซต์ระบบคณะกรรมการความปลอดภัย พัฒนาด้วย Next.js 15 + Cloudflare Workers + D1

## Tech Stack
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend API**: Cloudflare Workers + Hono.js
- **Database**: Cloudflare D1 (ชื่อ: jdecommitee)
- **Auth**: JWT Token + bcrypt
- **Export**: xlsx (Excel) + JSZip

## Quick Start

### 1. ติดตั้ง Node.js (ถ้ายังไม่มี)
ดาวน์โหลดจาก https://nodejs.org/ (LTS version)

### 2. ติดตั้ง Wrangler CLI (สำหรับ Cloudflare)
```bash
npm install -g wrangler
wrangler login
```

### 3. ติดตั้ง dependencies
```bash
# Frontend
cd frontend
npm install

# Backend (Cloudflare Worker)
cd ../worker
npm install
```

### 4. สร้าง D1 Database
```bash
cd worker
wrangler d1 create jdecommitee
# คัดลอก database_id ที่ได้ไปใส่ใน wrangler.toml
wrangler d1 execute jdecommitee --file=./schema.sql
```

### 5. รัน Development
```bash
# Terminal 1: Worker API
cd worker
wrangler dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

## โครงสร้าง Permission
- **P0 - User**: ส่งเรื่องเข้าระบบได้ (เมื่อมีการเปิด Committee Day)
- **P1 - Admin**: เปิด/ปิด Committee Day, จัดการข้อมูล, Export
- **P2 - Super Admin**: จัดการ Account ทั้งหมด, ดู Admin Panel

## Features
1. ✅ Login / Register
2. ✅ Account Manager (P2 only)
3. ✅ Dashboard - แสดงรายการที่ส่งมา
4. ✅ เปิด Safety Committee Day (P1+)
5. ✅ ส่งเรื่องเข้าระบบ (เฉพาะเมื่อมีการเปิด)
6. ✅ แนบรูปภาพ + หมายเหตุ + เลือกประเภท
7. ✅ จัดเก็บรายเดือน + ID พร้อมวันที่
8. ✅ Export Excel รายเดือน/รายปี + รูป
9. ✅ อัพเดทสถานะ + รูปหลังแก้ไข
