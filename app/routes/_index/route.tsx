import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Link } from "@remix-run/react";

import styles from "./styles.module.css";

export const meta: MetaFunction = () => {
  return [
    { title: "B2B Payment & Delivery Guard | Fastloom Labs" },
    {
      name: "description",
      content:
        "Conditionally hide, reorder, and rename payment methods and delivery options at checkout with Shopify Functions.",
    },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return null;
};

export default function Index() {
  return (
    <div className={styles.index}>
      <main className={styles.main}>
        {/* Hero Section with App Icon */}
        <header className={styles.hero}>
          <div className={styles.iconWrapper}>
            <img
              src="/app-icon.png"
              alt="B2B Payment & Delivery Guard Icon"
              className={styles.icon}
              width="80"
              height="80"
            />
          </div>
          <span className={styles.badge}>Fastloom Labs • Shopify Functions</span>
          <h1 className={styles.heading}>B2B Payment & Delivery Guard</h1>
          <p className={styles.tagline}>
            Conditionally hide, reorder, and rename Payment Methods and Delivery Options directly at checkout without theme modifications.
          </p>
        </header>

        {/* App Store Installation Guidance */}
        <section className={styles.ctaCard} aria-labelledby="cta-heading">
          <h2 id="cta-heading" className={styles.ctaTitle}>
            Install via Shopify App Store
          </h2>
          <p className={styles.ctaDescription}>
            To install and configure B2B Payment & Delivery Guard for your store, please initiate installation from the official Shopify App Store listing or Shopify Admin.
          </p>
          <a
            href="https://apps.shopify.com"
            className={styles.button}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Shopify App Store
          </a>
        </section>

        {/* Core Feature Grid */}
        <section className={styles.featuresSection} aria-label="Key Features">
          <div className={styles.featuresGrid}>
            <article className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <h2 className={styles.featureTitle}>B2B Payment Customization</h2>
              <p className={styles.featureDescription}>
                Hide Cash on Delivery for large orders, restrict Credit Cards or BNPL for B2B accounts, and force Bank Wire / Net Terms based on customer tags.
              </p>
            </article>

            <article className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <h2 className={styles.featureTitle}>Delivery & Shipping Guard</h2>
              <p className={styles.featureDescription}>
                Restrict parcel options when heavy or freight products are in cart. Filter shipping rates by postal code prefixes or regex zones, and prioritize contracted rates.
              </p>
            </article>

            <article className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h2 className={styles.featureTitle}>Shopify Functions (WASM)</h2>
              <p className={styles.featureDescription}>
                Runs natively on Shopify Edge infrastructure with zero storefront latency impact and complete reliability during flash sales and peak wholesale traffic.
              </p>
            </article>

            <article className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h2 className={styles.featureTitle}>Simple Pro Plan</h2>
              <p className={styles.featureDescription}>
                $14.99/month with an unrestricted 14-day free trial. Unlimited payment and delivery rules with no hidden per-transaction fees.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>&copy; {new Date().getFullYear()} Fastloom Labs. All rights reserved.</span>
        <div className={styles.footerLinks}>
          <Link to="/privacy" className={styles.footerLink}>
            Privacy Policy
          </Link>
          <a
            href="https://shopify.dev/docs/apps/checkout"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.footerLink}
          >
            Documentation
          </a>
        </div>
      </footer>
    </div>
  );
}
