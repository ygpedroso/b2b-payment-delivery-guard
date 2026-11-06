# B2B Payment & Delivery Guard

Conditionally hide, reorder, and rename Payment Methods and Delivery (Shipping) Options at checkout based on cart totals, customer tags, product tags, postal code prefix/regex, and country/currency filters. Built with **Shopify Functions** (`purchase.payment-customization.run` and `purchase.delivery-customization.run`) compiled to WebAssembly (via Javy), an **Embedded Admin UI** (Remix + Polaris), and backed by **Shop Metafields** and **PostgreSQL** (Prisma).

Developed under the **Fastloom Labs** brand.

---

## Key Features

### 1. Payment Customization Function (`extensions/payment-customization`)
- **API Target:** `purchase.payment-customization.run` (Shopify API 2026-07).
- **Hide Payment Methods:** Hide payment methods (e.g. "Cash on Delivery", "Bank Deposit / Net 30", "Credit Card") dynamically at checkout.
- **Reorder Payment Methods:** Prioritize preferred B2B payment methods by moving them to index 0.
- **Condition Engine:**
  - **Cart Value Limits:** Min/Max cart subtotal conditions.
  - **Customer Tags:** Require specific tags (e.g., `b2b-verified`, `net30-approved`) or exclude certain tags (e.g., `retail`).
  - **Product Tags:** Trigger rule when cart contains items with specific tags (e.g., `hazardous`, `custom-order`, `wholesale-only`).
  - **Country Code:** Filter by shipping address country code.
  - **Currency Code:** Filter by checkout currency code.

### 2. Delivery Customization Function (`extensions/delivery-customization`)
- **API Target:** `purchase.delivery-customization.run` (Shopify API 2026-07).
- **Hide Shipping Rates:** Hide free or standard shipping methods (e.g., "Standard Ground", "Free Shipping", "Next Day Air") when conditions match.
- **Reorder Delivery Methods:** Move designated shipping rates to index 0 for streamlined B2B freight or local delivery.
- **Condition Engine:**
  - **Cart Subtotal Thresholds:** Restrict or reorder shipping based on cart subtotal.
  - **Customer & Product Tags:** Target wholesale customers or heavy/bulky product tags.
  - **Postal Code Matching:** Prefix matching (e.g., `M5V`, `90210`) or regular expression matching (e.g., `^9[0-5][0-9]{3}$`).
  - **Country & Currency Filters:** Target specific shipping destination countries and currencies.

### 3. Embedded Admin Dashboard & Builders
- **Dashboard (`/app`):** Overview metric cards, active rules counter, quick toggle switches for payment/delivery rules, and quick-start actions.
- **Payment Rule Builder (`/app/payment-rules`):** Form to configure name, target payment method, action (Hide / Reorder), priority, cart limits, customer tags, product tags, country, and currency.
- **Delivery Rule Builder (`/app/delivery-rules`):** Form to configure name, target delivery option, action (Hide / Reorder), priority, cart limits, customer tags, product tags, postal code prefix/regex, and country filters.
- **B2B Configuration Guide (`/app/guide`):** Step-by-step instructions for testing rules at checkout, configuring B2B customer tags, and optimizing checkout speed.
- **Billing Management (`/app/billing`):** Single-tier Pro Plan ($14.99/month with a 14-day free trial). Automatically detects Shopify Partner Development Stores to issue test charges with zero charges incurred.

---

## Architecture Overview

```
b2b-payment-delivery-guard/
├── app/                                # Remix Full-Stack App
│   ├── routes/                         # Polaris UI and Webhook endpoints
│   │   ├── _index/                     # Public marketing / install landing page
│   │   ├── app._index.tsx              # Admin overview dashboard
│   │   ├── app.payment-rules.tsx       # Payment rule CRUD builder
│   │   ├── app.delivery-rules.tsx      # Delivery rule CRUD builder
│   │   ├── app.billing.tsx             # Subscription & billing status
│   │   ├── app.guide.tsx               # B2B configuration guide
│   │   ├── auth.$.tsx & auth.login/    # Compliant OAuth flow (zero manual shop inputs)
│   │   ├── healthz.tsx                 # Docker/Railway health check probe
│   │   ├── privacy.tsx                 # Public privacy policy
│   │   └── webhooks.*.ts               # App uninstalled & mandatory GDPR webhooks
│   ├── services/
│   │   └── rules.server.ts             # Syncs DB rules to Shopify Metafields & Functions
│   ├── billing.server.ts               # Plan enforcement & test charge detection
│   ├── compliance.server.ts            # GDPR data requests and shop redact
│   ├── db.server.ts                    # Prisma client singleton
│   └── shopify.server.ts               # Shopify App initialization & API configuration
├── extensions/
│   ├── payment-customization/          # Shopify Function (WASM) for payment methods
│   │   ├── src/run.ts & run.test.ts    # Logic & unit tests
│   │   ├── src/run.graphql             # Checkout input query
│   │   └── dist/function.wasm          # Compiled WebAssembly binary
│   └── delivery-customization/         # Shopify Function (WASM) for delivery options
│       ├── src/run.ts & run.test.ts    # Logic & unit tests
│       ├── src/run.graphql             # Checkout input query
│       └── dist/function.wasm          # Compiled WebAssembly binary
├── prisma/
│   └── schema.prisma                   # PostgreSQL schema (Session, PaymentRule, DeliveryRule)
├── public/                             # App branding, favicons, and icons
├── test-cases.md                       # Comprehensive 12-scenario manual QA guide
└── tests/                              # Vitest suite covering server, routes & functions
```

---

## Quick Start & Local Development

### Prerequisites
- **Node.js**: v20 or higher (tested with Node v22 / v26)
- **NPM**: v10 or higher
- **Shopify CLI**: `@shopify/cli` v3.80.0+
- **PostgreSQL**: Local database or Railway/Neon PostgreSQL instance

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Variables & Local Database
Start the local PostgreSQL container via Docker Compose (runs on port 5443 to avoid port collisions):
```bash
docker compose up -d
```

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
The `.env` file configures the connection string:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5443/b2b_payment_delivery_guard?schema=public"
```

### 3. Setup Database & Prisma Migrations
```bash
npx prisma generate
npx prisma migrate deploy
```

### 4. Build Shopify Functions WASM
Build the WebAssembly binaries for both functions:
```bash
npm run build:functions
```
This runs Javy to produce `extensions/payment-customization/dist/function.wasm` and `extensions/delivery-customization/dist/function.wasm`.

### 5. Lint & Test
```bash
npm run lint
npm test
```
Executes all ESLint rules (0 errors, 0 warnings) and 33 Vitest unit tests across server logic, route loaders/actions, GDPR handlers, billing detection, and Shopify Functions.

### 6. Start Development Server
```bash
shopify app dev
```

---

## Testing & Quality Assurance

### Automated Tests
Run Vitest in watch or CI mode:
```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

### Manual Testing
Refer to [test-cases.md](test-cases.md) for 12 end-to-end verification scenarios:
1. App Installation & Billing Activation
2. Partner Dev Store Free Plan Bypass
3. Payment Customization - Cart Min Threshold (Net 30)
4. Payment Customization - Customer Tag Whitelist (B2B Only)
5. Payment Customization - Product Tag Blacklist (COD Restriction)
6. Delivery Customization - Heavy Freight / Postal Code Restriction
7. Delivery Customization - Wholesale Free Freight Reorder
8. Combined Payment & Delivery Customization
9. Rule Priority / Move Ordering
10. Metafield Synchronization Resilience
11. GDPR Webhooks Compliance
12. App Uninstall Cleanup & Session Invalidation

---

## Production Deployment (Railway & Docker)

### Docker
The app includes a multi-stage `Dockerfile` and `entrypoint.sh` for running database migrations and launching Remix:
```bash
# Build Docker image
docker build -t b2b-payment-delivery-guard .

# Run container
docker run -p 3000:3000 --env-file .env b2b-payment-delivery-guard
```

### Railway
The repo includes `railway.json` for one-click deployment:
1. Connect this repository to your Railway project.
2. Add a **PostgreSQL** service in Railway and link `DATABASE_URL`.
3. Provide `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, and `APP_URL` in Railway environment variables.
4. Deploy will automatically run `npx prisma db push` via `entrypoint.sh` and boot the server.

---

## App Store Compliance & Security

- **App Bridge v4:** Uses official CDN-hosted script tag in `<head>` (`https://cdn.shopify.com/shopifycloud/app-bridge.js`) without legacy React wrappers.
- **Requirement 2.3.1:** No manual shop domain input fields on the public landing page or login route. Direct OAuth initiation occurs via authenticated Shopify sessions.
- **GDPR Endpoints:** Fully implemented and tested handlers for `customers/data_request`, `customers/redact`, and `shop/redact`.
- **Zero Storefront Footprint:** No theme app extensions or JavaScript snippets injected into merchant theme storefronts. All logic executes in high-performance WebAssembly at checkout.

---

## License & Support

Developed by **Fastloom Labs**.
For technical questions or support, contact `support@fastloomlabs.com`.
