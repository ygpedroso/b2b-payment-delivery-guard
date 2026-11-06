import { describe, it, expect, beforeAll } from "vitest";

let shopifyModule: any;

beforeAll(async () => {
  process.env.SHOPIFY_APP_URL = "https://test-app.example.com";
  process.env.SHOPIFY_API_KEY = "test-api-key";
  process.env.SHOPIFY_API_SECRET = "test-api-secret";
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/test_db";
  shopifyModule = await import("../app/shopify.server");
});

describe("shopify.server module", () => {
  it("exports Shopify app configuration and core utilities", () => {
    expect(shopifyModule.default).toBeDefined();
    expect(shopifyModule.authenticate).toBeDefined();
    expect(shopifyModule.unauthenticated).toBeDefined();
    expect(shopifyModule.login).toBeDefined();
    expect(shopifyModule.registerWebhooks).toBeDefined();
    expect(shopifyModule.sessionStorage).toBeDefined();
  });
});
