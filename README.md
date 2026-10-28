# Classic Cuts Barbershop & Hair Salon POS System

A professional, full-stack **Barbershop & Hair Salon Point-of-Sale (POS)** web application built with **React**, **Node.js/Express**, and **Supabase (PostgreSQL + Auth)** with bilingual **Khmer (ភាសាខ្មែរ)** & English interface and dual-currency support ($ USD + ៛ KHR).

---

## ✨ Features for Barbershop & Salon

### 1. ✂️ Haircut Services & 🧴 Retail Haircare
- **Haircut & Grooming Services**: Infinite/untracked stock, customizable service duration (e.g., 25m, 30m, 45m, 60m), category grouping (Fades, Classic Cuts, Shaves, Washes, Color & Perm).
- **Retail Grooming Products**: Pomades, waxes, clays, beard oils, and shampoos with real-time stock inventory tracking.
- Atomic checkout transaction (`create_sale` Postgres function) that safely decrements inventory *only* for physical retail products, never blocking or decrementing haircut services.

### 2. 💈 Barbers & Stylists Management
- Manage staff roster with roles: **Master Barber**, **Senior Stylist**, **Barber**, and **Apprentice**.
- Assign barbers to individual tickets/services for cut tracking and commissions.
- Staff active/inactive status toggle and public team showcase.

### 3. ⏳ Walk-in Queue & Active Chairs Board (Queue)
- 3-Column live Salon Board:
  1. **⏳ Waiting List**: Track incoming walk-in clients, requested service, preferred barber, and notes.
  2. **💈 In Chair**: Active cuts in progress on salon chairs.
  3. **💵 Ready for Checkout**: 1-click **"Send to Register ➔"** that automatically prefills the client, barber, and service in the POS register.

### 4. 💵 Dual-Currency Checkout (USD + KHR) & Tips
- Automated currency exchange calculator ($1.00 = 4,100 ៛).
- Quick Tip buttons: **$0, $1, $2, $5, or custom tip** for barbers/stylists.
- Payment methods: **Cash USD, Cash KHR, ABA KHQR, and Card**.
- Cash received and Change Due calculator in both USD & KHR.
- Printable thermal-style receipt with salon branding, ticket ID, barber name, line items, tip, and totals.

### 5. 📊 Salon Dashboard & Reports
- Today's salon revenue ($ & ៛) and tip totals.
- Total haircut clients served today.
- Payment method breakdowns (USD, KHR, ABA KHQR, Card).
- Top performing barbers by revenue and services count (last 30 days).
- Top haircut services and low-stock retail haircare alerts.

### 6. 🌐 Public Salon Menu & Booking Showcase
- Modern salon landing page for clients to browse haircut service menus, durations, and retail products.
- Barbers team showcase.
- 1-click Telegram booking link with pre-filled haircut request message.

---

## 🏗️ Project Architecture

```
pos-app/
  supabase/
    schema.sql             ← Postgres tables, RLS policies, create_sale() function, & starter salon data
  server/                  ← Node.js / Express API
    src/
      routes/
        barbers.js         ← Staff / barbers CRUD & public directory
        queue.js           ← Walk-in queue & active chairs management
        products.js        ← Services & retail products CRUD
        sales.js           ← Atomic checkout, ticket history & receipts
        dashboard.js       ← Salon analytics & barber performance metrics
  client/                  ← React (Vite) Single Page App
    src/
      pages/
        admin/
          Dashboard.jsx    ← Salon KPIs, top barbers, revenue & payment stats
          Sell.jsx         ← Dual-currency POS register, tip selector, & receipt modal
          Queue.jsx        ← 3-column walk-in & chair queue board
          Products.jsx     ← Manage services (with duration) & products (with stock)
          Barbers.jsx      ← Staff & stylist management
          SalesHistory.jsx ← Ticket history, filter by barber, & receipt reprint
        client/
          Catalog.jsx      ← Public salon menu, pricing ($ & ៛), & barbers team
          ProductDetail.jsx← Service detail & 1-click Telegram booking
      lib/
        i18n.js            ← Khmer & English salon dictionary + dual-currency helpers
```

---

## 🚀 Quick Setup

### 1. Database Setup (Supabase)
1. In your [Supabase Dashboard](https://supabase.com), open the **SQL Editor**.
2. Run [`supabase/schema.sql`](supabase/schema.sql). This configures:
   - `categories`, `barbers`, `products`, `queue_tickets`, `sales`, and `sale_items`.
   - `create_sale` Postgres RPC transaction function.
   - Starter haircut categories, services, products, and barbers.
3. In **Authentication → Users**, create your salon admin account (email + password).

### 2. Backend Server (`server/`)
```bash
cd server
cp .env.example .env    # configure SUPABASE_URL and SUPABASE_ANON_KEY
npm install
npm run dev             # starts on http://localhost:4000
```

### 3. Frontend Client (`client/`)
```bash
cd client
cp .env.example .env.local  # configure VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm install
npm run dev                 # starts on http://localhost:5173
```

- Open `http://localhost:5173` for the public salon menu & booking showcase.
- Open `http://localhost:5173/admin` for the salon management portal.
