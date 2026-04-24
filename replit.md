# Northeast Basket

A full-stack online marketplace app built with Expo React Native + Express backend, designed for Longleng, Nagaland, India. Accessible in the browser AND via Expo Go.

**Tagline:** Empowering Local Sellers. Serving Local Homes.

## Architecture

### Frontend
- **Framework:** Expo Router (React Native) - file-based routing, supports web + mobile
- **Web output:** `"single"` SPA mode — `expo export --platform web` → `dist/`
- **State:** React Query for server state, React Context for auth/cart, AsyncStorage for cart persistence
- **Styling:** React Native StyleSheet with premium minimalist design system
- **Theming:** Dark/Light mode via ThemeContext (`contexts/theme.tsx`), saved to AsyncStorage
- **Colors:** Deep forest green primary, warm gold accent, cream/charcoal backgrounds
- **API URL:** `EXPO_PUBLIC_DOMAIN` when set (dev/mobile); falls back to `window.location.origin` on web (same-origin)

### Backend
- **Server:** Express.js (TypeScript) on port 5000 (dev) / port 8081 (production)
- **Database:** PostgreSQL (Replit managed)
- **Auth:** Session-based (Bearer token in header), SHA-256 password hashing
- **Body limit:** 15MB (supports base64 image uploads)
- **Static serving:** Serves `dist/index.html` as SPA catch-all in production (when `dist/` exists)

### Deployment
- **Build:** `EXPO_PUBLIC_DOMAIN='' npx expo export --platform web --output-dir dist && npm run server:build`
- **Run:** `PORT=8081 NODE_ENV=production node server_dist/index.js` (port 8081 → external port 80)
- **Target:** Replit Autoscale

## App Structure

```
app/
  _layout.tsx           # Root layout with all providers
  (auth)/               # Auth stack (login, register)
  (shop)/               # Customer tabs (home, search, cart, orders, profile)
  (vendor)/             # Vendor panel (dashboard, add/edit products)
  (admin)/              # Admin panel (dashboard, products, orders, vendors, fees)
  product/[id].tsx      # Product detail screen
  checkout.tsx          # Checkout screen

contexts/
  auth.tsx              # Authentication context & provider
  cart.tsx              # Shopping cart context & provider

server/
  index.ts              # Express app setup
  routes.ts             # All API routes
  storage.ts            # PostgreSQL queries

shared/
  schema.ts             # Drizzle ORM schema
```

## Demo Accounts

| Role     | Email                          | Password    |
|----------|-------------------------------|-------------|
| Admin    | admin@longlengbasket.com      | admin123    |
| Vendor   | vendor@longlengbasket.com     | vendor123   |
| Customer | customer@longlengbasket.com   | customer123 |

## Features

### User/Customer
- Register/login with email & password
- Browse products by 6 categories (Vegetables, Fruits, Meat, Groceries, Local Products, Others)
- Search products with text and category filter
- Product detail page with quantity selector
- Add to cart, update quantities, remove items
- Checkout with address and Cash on Delivery
- View order history with status tracking

### Vendor
- Register as vendor with shop details
- Dashboard with product list, stats, fee summary
- Add/edit/delete products (pending admin approval)
- View sales day fees and registration fees

### Admin
- Dashboard with analytics (orders, revenue, pending, vendors)
- Approve/reject vendor products
- Manage all orders with status updates (Pending → Confirmed → Out for Delivery → Delivered)
- Manage vendor accounts, assign slot numbers, track approval
- Fee tracking: platform fees (₹100/sales day) and registration fees (₹500/year)
- Create fee records and mark as paid/unpaid

### Business Model
- **Vendor Slot System:** Admin assigns slot numbers (limit vendors)
- **Platform Fee:** ₹100 per sales day (Monday, Wednesday, Friday)
- **Registration Fee:** ₹500 per year per vendor
- **Manual payment tracking:** Admin marks fees paid/unpaid
- **Delivery:** Manual assignment by admin, COD only

## API Routes

### Auth
- `POST /api/auth/register` — Register (customer or vendor)
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Get current user

### Public
- `GET /api/categories` — List categories
- `GET /api/products?category_id=&search=` — List approved products
- `GET /api/products/:id` — Product detail

### Customer (requires auth)
- `POST /api/orders` — Place order
- `GET /api/orders` — My orders

### Vendor (requires vendor/admin role)
- `GET/POST /api/vendor/profile` — Vendor profile
- `GET /api/vendor/products` — My products
- `POST /api/vendor/products` — Add product
- `PUT /api/vendor/products/:id` — Update product
- `DELETE /api/vendor/products/:id` — Delete product
- `GET /api/vendor/fees` — My fees

### Admin (requires admin role)
- `GET /api/admin/analytics` — Dashboard stats
- `GET /api/admin/products` — All products
- `PUT /api/admin/products/:id` — Update/approve product
- `DELETE /api/admin/products/:id` — Delete product
- `GET /api/admin/orders` — All orders
- `PUT /api/admin/orders/:id` — Update order status
- `GET /api/admin/vendors` — All vendors
- `PUT /api/admin/vendors/:id` — Update vendor (approve, slot, reg fee)
- `GET/POST /api/admin/fees` — Fee records
- `PUT /api/admin/fees/:id` — Update fee paid status

## Workflows

- **Start Backend:** `npm run server:dev` — Express server on port 5000
- **Start Frontend:** `npm run expo:dev` — Expo on port 8081

## Sample Data

Pre-seeded with:
- 6 categories
- 3 users (admin, vendor, customer)
- 18 products (Naga local market items: bamboo shoots, axone, smoked meat, etc.)
- 1 vendor profile with slot assigned
- Sample fee records

## How to Run

1. Both workflows start automatically
2. Open app at port 8081 in browser or scan QR code with Expo Go
3. Login with demo accounts above
4. Try customer flow: browse → cart → checkout
5. Try vendor flow: login as vendor, add products
6. Try admin flow: login as admin, approve products, manage orders
