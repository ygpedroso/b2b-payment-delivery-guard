# Manual Testing Plan: B2B Payment & Delivery Guard

This document is a step-by-step verification guide to manually test all supported payment and delivery customization rules in your Shopify store checkout, embedded admin UI workflows, GraphQL synchronization, and App Store compliance.

---

## 1. Prerequisites & Environment Setup

### 1.1 Start the Development Server
In your terminal, start the app and local tunnel:
```bash
shopify app dev
```
*(Optionally target your dev store directly: `shopify app dev --store your-b2b-store.myshopify.com`)*

### 1.2 Enable Shopify Functions in Shopify Admin
1. Go to **Settings** &rarr; **Payments** in Shopify Admin.
   - Verify available payment gateways (e.g. Shopify Payments / Credit Card, Cash on Delivery, Bank Deposit, Klarna / Affirm).
   - Under **Checkout rules** or **Payment customizations**, ensure **B2B Payment Customization** is active.
2. Go to **Settings** &rarr; **Shipping and delivery** in Shopify Admin.
   - Verify shipping profiles and rates (e.g. Standard Ground, Express 2-Day Air, Contracted B2B Freight LTL).
   - Under **Delivery customizations**, ensure **B2B Delivery Customization** is active.

### 1.3 Configure App Rules in Embedded Admin UI
Navigate to **Apps** &rarr; **B2B Payment & Delivery Guard**:
- Check that the dashboard loads the two summary cards: **Active Payment Rules** and **Active Delivery Rules**.
- Verify that the subscription status badge displays **Active** or **Partner Dev Store (Free)** under the single **B2B Pro Monthly ($14.99/mo)** tier.

---

## 2. Test Data Setup in Shopify Admin

### 2.1 Customer Accounts
Create or tag test customer accounts in **Shopify Admin &rarr; Customers**:

| Customer Email | Tags | Purpose |
| :--- | :--- | :--- |
| `retail@example.com` | *(No tags)* | Standard retail consumer |
| `wholesale@example.com` | `wholesale`, `b2b` | Contracted wholesale buyer |
| `netterms@example.com` | `net-terms`, `b2b` | Invoiced B2B buyer on Net 30/60 |

### 2.2 Test Products & Tags
Create or tag test products in **Shopify Admin &rarr; Products**:

| Product Name | Tags | Price | Weight | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Product X: Heavy Industrial Compressor** | `freight`, `oversized` | $850.00 | 75.0 lbs | Tests freight requirement & heavy item parcel blocking |
| **Product Y: Standard Wholesale Widget** | `wholesale-only` | $50.00 | 2.0 lbs | Tests B2B payment gateway restrictions |
| **Product Z: Retail Coffee Mug** | *(No tags)* | $15.00 | 0.8 lbs | Standard consumer retail checkout |

### 2.3 Payment Methods Configured
In **Settings &rarr; Payments**:
1. **Credit Cards / Shopify Payments** (or Bogus Gateway in development)
2. **Cash on Delivery (COD)** (Manual payment method)
3. **Bank Deposit / Wire Transfer** (Manual payment method)
4. **Buy Now Pay Later (Klarna / Affirm)** (if enabled)

### 2.4 Delivery / Shipping Rates Configured
In **Settings &rarr; Shipping and delivery**:
1. **Standard Ground Shipping** ($10.00)
2. **Express 2-Day Air** ($35.00)
3. **Contracted B2B Freight (LTL)** ($120.00)

---

## 3. Test Cases Execution Matrix

### Test Case 1: Hide Cash on Delivery (COD) for High-Value Carts (> $200)
- **Objective:** Verify that Cash on Delivery is automatically hidden when the cart subtotal exceeds the configured threshold.
- **App Rule Configuration:**
  - Name: `Hide COD over $200`
  - Status: `Active`
  - Minimum Subtotal: `200.00`
  - Target Payment Method Name: `Cash on Delivery`
  - Action: `Hide Method`
- **Execution Steps:**
  1. Add 1 &times; **Product X: Heavy Industrial Compressor** ($850.00) to the cart.
  2. Subtotal is $850.00 (greater than $200.00).
  3. Proceed to checkout and continue to the **Payment** step.
- **Expected Result:**
  - [ ] **Cash on Delivery** is NOT shown among available payment methods.
  - [ ] Credit Card and Bank Deposit remain visible.
- **Status:** [X] PASS / [] FAIL

---

### Test Case 2: Allow Cash on Delivery When Cart is Under Threshold (<= $200)
- **Objective:** Verify that COD remains accessible for retail or small orders.
- **App Rule Configuration:** Same as Test Case 1 (`Hide COD over $200`).
- **Execution Steps:**
  1. Clear the cart.
  2. Add 2 &times; **Product Y: Standard Wholesale Widget** ($50.00 each = $100.00 subtotal).
  3. Subtotal is $100.00 (below $200.00).
  4. Proceed to checkout and continue to the **Payment** step.
- **Expected Result:**
  - [ ] **Cash on Delivery** is visible and selectable.
- **Status:** [X] PASS / [] FAIL

---

### Test Case 3: Force Wire Transfer / Net Terms for B2B Tagged Customers
- **Objective:** Restrict alternative payment methods (like Cash on Delivery / BNPL) or Credit Cards for wholesale accounts to prevent fee overhead or enforce invoice settlement.
- **Shopify Platform Note:**
  > [!NOTE]
  > **Shopify Plus Platform Limitation:** In the US and Canada, Shopify's checkout engine strictly prohibits non-Plus stores (including standard development stores) from hiding credit card gateways. If a function returns a `hide` operation for a credit card on a non-Plus store, Shopify silences the hide operation and still displays the card form. To test hiding credit cards, the test store must be created with **Developer preview: Shopify Plus / B2B** in Shopify Partners.
  > 
  > On standard development stores, test this rule using alternative/manual payment methods (such as **Cash on Delivery**, **Klarna**, or **Affirm**) which Shopify allows all plans to customize.
- **App Rule Configuration (Standard Dev Store - Alternative Methods):**
  - Rule 1:
    - Name: `Hide COD & BNPL for B2B`
    - Customer Tags: `b2b, wholesale` (Match ANY)
    - Target Payment Method Name: `Cash on Delivery, Klarna, Affirm`
    - Action: `Hide Method`
- **App Rule Configuration (Shopify Plus Dev Store - Credit Card Hiding):**
  - Rule 2:
    - Name: `Hide Credit Card for B2B`
    - Customer Tags: `b2b, wholesale` (Match ANY)
    - Target Payment Method Name: `Credit Card, Bogus Gateway, Shopify Payments`
    - Action: `Hide Method`
- **Execution Steps:**
  1. Log in as a customer account tagged `wholesale` or `b2b` (e.g. `wholesale@example.com`). *(Important: Customer must be logged in so `buyerIdentity.customer.hasTags` is evaluated)*.
  2. Add products to the cart and proceed to checkout.
  3. Navigate to the **Payment** step.
- **Expected Result:**
  - [ ] Targeted methods (**Cash on Delivery**, **Klarna / Affirm**, and on Plus stores **Credit Card**) are hidden.
  - [ ] **Bank Deposit / Wire Transfer** remains visible and selectable.
- **Status:** [X] PASS / [ ] FAIL

---

### Test Case 4: Allow Restricted Methods for Untagged Retail Shoppers
- **Objective:** Ensure retail shoppers are not affected by wholesale payment restrictions.
- **Execution Steps:**
  1. Log out or open an incognito window as a guest or logged in as `retail@example.com` (no tags).
  2. Add products to the cart and proceed to checkout.
  3. Navigate to the **Payment** step.
- **Expected Result:**
  - [ ] **Cash on Delivery**, **Credit Card**, and **Klarna** are visible and selectable.
- **Status:** [X] PASS / [ ] FAIL

---

### Test Case 5: Restrict Payment Methods by Shipping Country Code
- **Objective:** Ensure payment gateways (e.g. COD) are restricted to designated domestic regions.
- **App Rule Configuration:**
  - Name: `COD Domestic Only (US)`
  - Country Codes: `US`
  - Target Payment Method Name: `Cash on Delivery`
  - Action: `Move to Bottom`
- **Execution Steps:**
  1. Enter a shipping address in Canada (`CA`).
  2. Proceed to payment.
- **Expected Result:**
  - [ ] Rule only triggers for matching country code `US`.
- **Status:** [X] PASS / [ ] FAIL

---

### Test Case 6: Hide Parcel Delivery (Express/Standard) When Freight Items are in Cart
- **Objective:** Prevent buyers from selecting cheap parcel shipping when ordering heavy, palletized, or freight-required goods.
- **App Rule Configuration:**
  - Name: `Hide Express for Freight`
  - Status: `Active`
  - Product Tags: `freight`
  - Target Delivery Option Name Match: `Express`
  - Action: `Hide Option`
  - *(Optional second rule hiding `Standard`)*
- **Execution Steps:**
  1. Add 1 &times; **Product X: Heavy Industrial Compressor** (tagged `freight`) to the cart.
  2. Proceed to checkout and enter any standard shipping address.
  3. Navigate to the **Shipping method** step.
- **Expected Result:**
  - [ ] **Express 2-Day Air** is hidden from the delivery options list.
  - [ ] **Contracted B2B Freight (LTL)** is available.
- **Status:** [X] PASS / [ ] FAIL

---

### Test Case 7: Postal Code / Zip Prefix Delivery Restriction
- **Objective:** Block standard delivery options for specific postal code regions or zones using prefix matching.
- **App Rule Configuration:**
  - Name: `Hide Standard for Rochester NY (146xx)`
  - Postal Code Match Type: `Prefix Match`
  - Postal Code / Zip Filter: `146`
  - Target Delivery Option Name Match: `Standard`
  - Action: `Hide Option`
- **Execution Steps:**
  1. In checkout address suggestions, select: `1 Rodeo Dr, Rochester NY 14612, United States` (or enter city: `Rochester`, State: `NY`, ZIP: `14612`).
  2. Continue to **Shipping method**.
- **Expected Result:**
  - [ ] **Standard Ground Shipping** is hidden.
  - [ ] Other delivery options (e.g. **Express 2-Day Air**, **Contracted B2B Freight**) remain available.
- **Status:** [X] PASS / [ ] FAIL

---

### Test Case 8: PO Box Regex Filter
- **Objective:** Restrict freight delivery to physical commercial loading docks (block PO Boxes in street address lines or postal codes).
- **App Rule Configuration:**
  - Name: `No Freight to PO Boxes`
  - Postal Code Match Type: `Regex Pattern`
  - Postal Code / Zip Filter: `P\.?O\.?\s?BOX` *(Evaluated case-insensitively across street address lines `address1`, `address2`, and `zip`)*
  - Target Delivery Option Name Match: `Freight`
  - Action: `Hide Option`
- **Execution Steps:**
  1. In checkout, enter address with `Po Box` or `PO BOX 405` in the address line or zip.
  2. Continue to **Shipping method**.
- **Expected Result:**
  - [ ] **Contracted B2B Freight (LTL)** is hidden.
- **Status:** [X] PASS / [ ] FAIL

---

### Test Case 9: Prioritize Contracted B2B Carrier Rates (Move to Top)
- **Objective:** Reorder shipping options so the merchant's contracted B2B rate appears first.
- **App Rule Configuration:**
  - Name: `Prioritize B2B Carrier`
  - Status: `Active`
  - Target Delivery Option Name Match: `Contracted B2B Freight`
  - Action: `Move to Top (Prioritize)`
- **Execution Steps:**
  1. Proceed to checkout shipping step where multiple delivery options are available.
- **Expected Result:**
  - [ ] **Contracted B2B Freight (LTL)** is placed at the top (first position) of the shipping options list.
- **Status:** [ ] PASS / [ ] FAIL

---

### Test Case 10: Rule Draft Toggle & Disable
- **Objective:** Verify that disabling a rule or setting it to Draft immediately halts its enforcement at checkout.
- **Execution Steps:**
  1. In **Apps &rarr; B2B Payment & Delivery Guard**, locate `Hide COD over $200`.
  2. Click **Disable** (Status changes to `DRAFT`).
  3. Reload checkout with an order over $200.
- **Expected Result:**
  - [ ] Cash on Delivery is now visible (rule is bypassed).
  - [ ] Clicking **Enable** reactivates the rule immediately.
- **Status:** [ ] PASS / [ ] FAIL

---

### Test Case 11: Compliance & Unauthenticated Landing Verification (Requirement 2.3.1)
- **Objective:** Verify strict adherence to Shopify App Store requirement 2.3.1 (no manual shop entry forms).
- **Execution Steps:**
  1. Open a new private browsing window.
  2. Navigate directly to `http://localhost:3000/` (or production URL without query params).
  3. Navigate directly to `http://localhost:3000/auth/login`.
- **Expected Result:**
  - [ ] Neither page contains an `<input name="shop">` or text input asking for a myshopify domain.
  - [ ] Both pages display official Fastloom Labs branding, app icon, feature descriptions, and direct the user to install via the Shopify App Store.
- **Status:** [ ] PASS / [ ] FAIL

---

### Test Case 12: Health Check & Webhook Compliance
- **Objective:** Verify uptime monitoring and GDPR webhook handlers.
- **Execution Steps:**
  1. Send GET request: `curl -i http://localhost:3000/healthz`
  2. Verify response:
     - HTTP Status: `200 OK`
     - Body: `OK`
     - Header: `Cache-Control: no-cache, no-store, must-revalidate`
- **Expected Result:**
  - [ ] Health check responds with 200 OK.
- **Status:** [ ] PASS / [ ] FAIL
