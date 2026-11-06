import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Policy - B2B Payment & Delivery Guard | Fastloom Labs" },
    { name: "description", content: "Privacy Policy for B2B Payment & Delivery Guard Shopify App" },
  ];
};

export default function PrivacyPolicy() {
  return (
    <main
      style={{
        maxWidth: "760px",
        margin: "0 auto",
        padding: "48px 20px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        lineHeight: "1.6",
        color: "#1a1a1a",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "8px" }}>Privacy Policy</h1>
      <p style={{ color: "#666", marginBottom: "32px" }}>
        Last updated: October 2026
      </p>

      <section style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.25rem" }}>1. Overview</h2>
        <p>
          B2B Payment & Delivery Guard ("the App") is developed by Fastloom Labs to provide checkout payment method and delivery option customization rules for wholesale and B2B merchants on Shopify.
          This Privacy Policy outlines how the App handles merchant and store data.
        </p>
      </section>

      <section style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.25rem" }}>2. Data Collection and Storage</h2>
        <p>
          <strong>No End-Customer Personal Data Stored:</strong> The App does not collect, track, or
          persist customer Personally Identifiable Information (PII) such as names, physical addresses,
          payment details, credit card numbers, or email addresses to any external database.
        </p>
        <p>
          <strong>Edge Execution via Shopify Functions:</strong> All checkout customization logic is executed
          natively on Shopify Edge via WebAssembly (Shopify Functions). Data evaluated at checkout (such as cart totals,
          customer tags, and delivery options) is processed in-memory during checkout evaluation and is never captured,
          logged, or stored externally.
        </p>
        <p>
          <strong>Merchant Configuration:</strong> App settings (payment rules, delivery rules, and target matching criteria)
          are stored securely in the app database and synchronized to the merchant's store using native Shopify Shop Metafields.
        </p>
        <p>
          <strong>Merchant Authentication:</strong> The App stores offline session authentication
          tokens (shop domain and API access tokens) necessary to authenticate communications between
          Shopify and the App admin interface.
        </p>
      </section>

      <section style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.25rem" }}>3. Data Sharing and Third Parties</h2>
        <p>
          We do not sell, rent, trade, or share merchant or customer data with third-party advertisers or
          data brokers.
        </p>
      </section>

      <section style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.25rem" }}>4. Compliance and Data Erasure (GDPR)</h2>
        <p>
          The App adheres to Shopify's mandatory privacy and GDPR compliance webhooks. When a merchant uninstalls
          the App or when Shopify issues a redaction webhook, all session and rule records associated with the store are
          permanently deleted from storage.
        </p>
      </section>

      <section style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.25rem" }}>5. Contact Us</h2>
        <p>
          If you have questions regarding this Privacy Policy, contact support at:{" "}
          <a href="mailto:support@fastloomlabs.com">support@fastloomlabs.com</a>
        </p>
      </section>
    </main>
  );
}
