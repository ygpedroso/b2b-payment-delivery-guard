import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleComplianceWebhook } from "../../app/compliance.server";
import { authenticate } from "../../app/shopify.server";
import db from "../../app/db.server";

vi.mock("../../app/shopify.server", () => ({
  authenticate: {
    webhook: vi.fn(),
  },
}));

vi.mock("../../app/db.server", () => ({
  default: {
    paymentRule: { deleteMany: vi.fn() },
    deliveryRule: { deleteMany: vi.fn() },
    customizationSetting: { deleteMany: vi.fn() },
    session: { deleteMany: vi.fn() },
  },
}));

describe("compliance.server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles customers/data_request by returning 200 without reading database", async () => {
    vi.mocked(authenticate.webhook).mockResolvedValueOnce({
      topic: "CUSTOMERS_DATA_REQUEST",
      shop: "test-shop.myshopify.com",
    } as any);

    const response = await handleComplianceWebhook(new Request("https://example.com/webhooks/compliance"));

    expect(response.status).toBe(200);
    expect(db.session.deleteMany).not.toHaveBeenCalled();
  });

  it("handles customers/redact by returning 200 without database modification", async () => {
    vi.mocked(authenticate.webhook).mockResolvedValueOnce({
      topic: "CUSTOMERS_REDACT",
      shop: "test-shop.myshopify.com",
    } as any);

    const response = await handleComplianceWebhook(new Request("https://example.com/webhooks/compliance"));

    expect(response.status).toBe(200);
    expect(db.session.deleteMany).not.toHaveBeenCalled();
  });

  it("handles shop/redact by deleting all records associated with that shop", async () => {
    vi.mocked(authenticate.webhook).mockResolvedValueOnce({
      topic: "SHOP_REDACT",
      shop: "test-shop.myshopify.com",
    } as any);

    const response = await handleComplianceWebhook(new Request("https://example.com/webhooks/compliance"));

    expect(response.status).toBe(200);
    expect(db.paymentRule.deleteMany).toHaveBeenCalledWith({
      where: { shop: "test-shop.myshopify.com" },
    });
    expect(db.deliveryRule.deleteMany).toHaveBeenCalledWith({
      where: { shop: "test-shop.myshopify.com" },
    });
    expect(db.customizationSetting.deleteMany).toHaveBeenCalledWith({
      where: { shop: "test-shop.myshopify.com" },
    });
    expect(db.session.deleteMany).toHaveBeenCalledWith({
      where: { shop: "test-shop.myshopify.com" },
    });
  });
});
