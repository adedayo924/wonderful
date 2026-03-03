# Wonderful Auto & Tech - E-Commerce Store

A full-featured e-commerce website for laptops, gadgets, accessories, and care products.

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Supabase (Auth, Database)
- **Payments**: OPay (via Supabase Edge Functions)
- **Hosting**: GitHub Pages

## Project Structure

```
wonderful-auto-tech/
├── index.html              # Home page
├── pages/                  # All HTML pages
│   ├── products.html       # Product listing
│   ├── cart.html           # Shopping cart
│   ├── checkout.html       # Checkout
│   ├── login.html          # Sign in
│   ├── register.html       # Sign up
│   ├── account.html        # User account
│   ├── orders.html         # Order history
│   ├── admin.html          # Admin panel
│   └── product-detail.html # Product details
├── css/
│   └── styles.css          # All styles
├── js/
│   ├── config.js           # Supabase configuration
│   ├── auth.js             # Authentication
│   ├── products.js         # Product handling
│   ├── cart.js             # Cart management
│   ├── checkout.js         # Payment flow
│   └── app.js              # Main app logic
└── supabase/
    └── functions/          # Edge Functions
        ├── create-payment/
        └── verify-payment/
```

## Setup Instructions

### 1. Database Setup (Supabase)

1. Go to [Supabase](https://supabase.com) and create a project
2. Copy the SQL from `supabase-setup.sql`
3. Run it in the Supabase SQL Editor

### 2. Configure Supabase Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Set environment variables
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set OPAY_MERCHANT_ID=your_merchant_id
supabase secrets set OPAY_PUBLIC_KEY=your_public_key
supabase secrets set OPAY_MODE=test  # or 'production'

# Deploy Edge Functions
supabase functions deploy create-payment
supabase functions deploy verify-payment
```

### 3. Configure OPay

1. Register at [OPay Merchant Dashboard](https://merchant.opaycheckout.com)
2. Get your Merchant ID and Public Key
3. Use test mode for development

## GitHub Pages URL

```
https://adedayo924.github.io/wonderful/
```

### 4. Deploy to GitHub Pages

1. Create a GitHub repository
2. Push all files
3. Go to Settings → Pages
4. Deploy from `main` branch

### 5. Update Configuration

In `js/config.js`, update:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key

## Features

### Customer Features
- Browse products by category
- Search products
- Add to cart
- User registration/login
- Checkout with OPay payment
- View order history
- Update profile

### Admin Features
- Add/Edit/Delete products
- View all orders
- Update order status

## Security

- Row Level Security (RLS) enabled on all tables
- Admin access controlled via `is_admin` flag in profiles
- Payment processing via server-side Edge Functions

## License

MIT
