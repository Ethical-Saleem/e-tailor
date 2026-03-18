# eTailor — Smart Tailor Business Manager

> Offline-first PWA for tailors, fashion designers & shop owners.
> Built with **Nuxt 3** · **Dexie.js** · **Supabase** · **Tailwind CSS**

---

## ✨ Features

| Module | Capabilities |
|---|---|
| **Customers** | Full profiles, measurements library, tags (VIP, Wedding, etc.), order history, outstanding balances |
| **Orders** | Kanban + list views, 6-stage pipeline, priority flags, payment tracking, WhatsApp notifications |
| **Measurements** | Flexible per-garment schemas, reusable templates, multi-profile per customer, comparison diffs |
| **Materials** | Inventory tracking, price history charts, low-stock alerts, purchase logging |
| **Dashboard** | Revenue trend, order stats, top customers, overdue alerts |
| **Reports** | Monthly/custom date ranges, CSV export, print PDF |
| **Offline-First** | All features work without internet; background sync to Supabase when online |
| **PWA** | Installable on mobile & desktop, works offline, push-ready |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20+
- **Supabase** account ([supabase.com](https://supabase.com))

### 1. Clone & install

```bash
git clone https://github.com/your-org/etailor.git
cd etailor
npm install
```

### 2. Set up Supabase

1. Create a new project at [app.supabase.com](https://app.supabase.com)
2. Go to **SQL Editor** and run the migrations in order:
   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_views_and_helpers.sql
   ```
3. Copy your project URL and anon key from **Settings → API**

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Register your shop and you're ready!

---

## 📁 Project Structure

```
etailor/
├── app/
│   ├── assets/css/         # Global styles (Tailwind + CSS vars)
│   ├── components/
│   │   ├── dashboard/      # RevenueChart, TopCustomerRow
│   │   ├── orders/         # OrderCard (with pipeline progress)
│   │   └── shared/         # SyncStatusBar, ToastContainer
│   ├── composables/
│   │   ├── useOfflineSync  # ★ Core sync engine
│   │   ├── useCustomers    # Customer CRUD + offline
│   │   ├── useOrders       # Order lifecycle + payments
│   │   ├── useMaterials    # Inventory + price history
│   │   ├── useMeasurements # Flexible measurement profiles
│   │   ├── useDashboard    # Aggregated stats + reports
│   │   ├── useCurrency     # Formatting helpers
│   │   └── useNotifications# Alerts engine
│   ├── db/
│   │   └── schema.ts       # Dexie IndexedDB schema (local DB)
│   ├── layouts/
│   │   ├── default.vue     # App shell with bottom nav
│   │   └── auth.vue        # Login/register layout
│   ├── middleware/
│   │   └── auth.ts         # Route guard
│   ├── pages/
│   │   ├── index.vue           # Dashboard
│   │   ├── orders/             # List, [id], new
│   │   ├── customers/          # List, [id], new
│   │   ├── materials/          # List + stock management
│   │   ├── reports/            # Analytics + export
│   │   └── settings/           # Shop config
│   ├── stores/
│   │   ├── auth.ts         # Shop + user session
│   │   ├── orders.ts       # Reactive orders cache
│   │   ├── materials.ts    # Reactive materials cache
│   │   └── ui.ts           # Toasts + theme
│   └── types/
│       ├── models.ts       # All domain types (Customer, Order, etc.)
│       └── index.ts        # Re-exports
├── supabase/
│   ├── migrations/         # SQL schema + RLS policies
│   └── functions/          # Edge functions (WhatsApp, Invoice)
├── nuxt.config.ts          # Nuxt + PWA + Supabase config
├── tailwind.config.ts      # Design tokens
└── package.json
```

---

## 🔄 Offline-First Architecture

```
User Action
    │
    ▼
IndexedDB (Dexie.js)   ← Instant write, always succeeds
    │
    ▼
Sync Queue             ← Operations queued with status
    │
    │  (when online)
    ▼
Supabase (PostgreSQL)  ← Cloud backup + multi-device sync
```

**Sync states shown in the status bar:**
| State | Meaning |
|---|---|
| 🟢 Synced | All changes backed up |
| 🟡 Pending | Local changes awaiting sync |
| 🔵 Syncing | Actively syncing to cloud |
| ⚫ Offline | Working locally, no connection |
| 🔴 Error | Sync failed, will retry |

**Conflict resolution:** Last-write-wins by `updatedAt` timestamp. If a record has been modified both locally and remotely since last sync, the newer timestamp wins.

---

## 🛡️ Security

- **Row Level Security (RLS)** on every Supabase table — users can only access their own shop's data
- **JWT-scoped queries** via `get_my_shop_id()` helper function
- **Soft deletes** everywhere — no hard deletes, full audit trail
- **Immutable event log** (`order_events`) for all order mutations
- **No sensitive data in LocalStorage** — only shop/user IDs persisted

---

## 🌍 Multi-Currency Support

Supported currencies out of the box: `NGN ₦`, `USD $`, `GBP £`, `EUR €`, `GHS ₵`, `KES KSh`, `ZAR R`, `XOF CFA`. Add more in `auth.ts → getCurrencySymbol()`.

---

## 📱 PWA Installation

On mobile Chrome/Safari: tap the browser menu → **"Add to Home Screen"**. The app will work fully offline once installed.

On desktop Chrome: click the install icon in the address bar.

---

## 🔧 Supabase Edge Functions

### Deploy

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Deploy functions
supabase functions deploy notify-order-ready --project-ref YOUR_PROJECT_REF
supabase functions deploy generate-invoice   --project-ref YOUR_PROJECT_REF
```

### Set secrets

```bash
supabase secrets set WHATSAPP_TOKEN=your_meta_whatsapp_token
supabase secrets set WHATSAPP_PHONE_ID=your_whatsapp_phone_id
```

---

## 📊 Database Migrations

Migrations are in `supabase/migrations/`. Run them in order via the Supabase SQL editor or CLI:

```bash
supabase db push
```

---

## 🗺️ Roadmap

### v1.0 (Current MVP)
- [x] Customer management + measurements
- [x] Orders + 6-stage pipeline
- [x] Materials + price history
- [x] Dashboard + reports
- [x] Offline-first sync engine
- [x] PWA installable

### v1.1
- [ ] Multi-staff with role-based access (owner / manager / staff)
- [ ] Invoice PDF generation (client-side)
- [ ] Bulk CSV import for customers
- [ ] Design image attachments per order
- [ ] Order work tickets for tailors (print)

### v1.2
- [ ] Multi-branch / multi-shop support
- [ ] Customer-facing order status portal (shareable link)
- [ ] Recurring measurements reminders
- [ ] Fabric recommendation based on order history
- [ ] Advanced analytics with date range comparison

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 Licence

A Product of Primecodes Global Technology Limited.

---

*Built with ❤️ for the tailoring community. Designed to work in Lagos, London, or anywhere in between.*
