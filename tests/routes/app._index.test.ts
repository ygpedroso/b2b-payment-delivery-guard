import { describe, it, expect, vi, beforeEach } from "vitest";
import { loader, action } from "../../app/routes/app._index";
import { authenticate } from "../../app/shopify.server";
import db from "../../app/db.server";
import { RuleStatus, RuleType } from "../../app/types/rules";

vi.mock("../../app/shopify.server", () => ({
  authenticate: {
    admin: vi.fn(),
  },
}));

vi.mock("../../app/billing.server", () => ({
  requireBilling: vi.fn(),
  PRO_PLAN: "b2b-pro-monthly",
}));

vi.mock("../../app/db.server", () => ({
  default: {
    paymentRule: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    deliveryRule: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    customizationSetting: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../app/services/rules.server", () => ({
  syncPaymentRules: vi.fn().mockResolvedValue([]),
  syncDeliveryRules: vi.fn().mockResolvedValue([]),
}));

describe("app._index route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loader returns rules and active count", async () => {
    vi.mocked(authenticate.admin).mockResolvedValueOnce({
      admin: {} as any,
      session: { shop: "test-shop.myshopify.com" } as any,
      billing: {} as any,
    } as any);

    vi.mocked(db.paymentRule.findMany).mockResolvedValueOnce([
      { id: "p1", name: "COD Rule", status: RuleStatus.ACTIVE, shop: "test-shop.myshopify.com" },
      { id: "p2", name: "Klarna Rule", status: RuleStatus.DRAFT, shop: "test-shop.myshopify.com" },
    ] as any);

    vi.mocked(db.deliveryRule.findMany).mockResolvedValueOnce([
      { id: "d1", name: "Freight Rule", status: RuleStatus.ACTIVE, shop: "test-shop.myshopify.com" },
    ] as any);

    vi.mocked(db.customizationSetting.findUnique).mockResolvedValueOnce(null);

    const response = await loader({
      request: new Request("https://example.com/app"),
      params: {},
      context: {},
    });

    const data = await response.json();
    expect(data.shop).toBe("test-shop.myshopify.com");
    expect(data.activePaymentCount).toBe(1);
    expect(data.activeDeliveryCount).toBe(1);
    expect(data.paymentRules).toHaveLength(2);
    expect(data.deliveryRules).toHaveLength(1);
  });

  it("action toggles rule status", async () => {
    vi.mocked(authenticate.admin).mockResolvedValueOnce({
      admin: {} as any,
      session: { shop: "test-shop.myshopify.com" } as any,
      billing: {} as any,
    } as any);

    vi.mocked(db.paymentRule.findUnique).mockResolvedValueOnce({
      id: "p1",
      status: RuleStatus.ACTIVE,
      shop: "test-shop.myshopify.com",
    } as any);

    const formData = new FormData();
    formData.append("intent", "toggle_status");
    formData.append("ruleType", RuleType.PAYMENT);
    formData.append("ruleId", "p1");

    const response = await action({
      request: new Request("https://example.com/app", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    });

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(db.paymentRule.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: RuleStatus.DRAFT },
    });
  });
});
