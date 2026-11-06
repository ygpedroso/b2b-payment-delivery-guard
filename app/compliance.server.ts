import { authenticate } from "./shopify.server";
import db from "./db.server";

export async function handleComplianceWebhook(request: Request) {
  const { topic, shop } = await authenticate.webhook(request);

  console.log(`Received compliance webhook ${topic} for ${shop}`);

  const normalized = topic.toLowerCase();

  if (normalized.includes("data_request")) {
    // The app does not store customer personally identifiable information (PII).
    // Validation & customization runs at checkout via Shopify Functions (WASM) and configuration is stored in shop metafields.
    return new Response(null, { status: 200 });
  }

  if (normalized.includes("customers") && normalized.includes("redact")) {
    // The app does not store customer PII; no records to redact.
    return new Response(null, { status: 200 });
  }

  if (normalized.includes("shop") && normalized.includes("redact")) {
    // Redact/erase any remaining shop session and rule data from the database
    if (shop) {
      await Promise.all([
        db.paymentRule.deleteMany({ where: { shop } }),
        db.deliveryRule.deleteMany({ where: { shop } }),
        db.customizationSetting.deleteMany({ where: { shop } }),
        db.session.deleteMany({ where: { shop } }),
      ]);
    }
    return new Response(null, { status: 200 });
  }

  console.warn(`Unhandled compliance topic: ${topic}`);
  return new Response(null, { status: 200 });
}
