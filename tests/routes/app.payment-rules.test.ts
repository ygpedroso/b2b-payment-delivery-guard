import { describe, it, expect, vi, beforeEach } from "vitest";
import { loader, action } from "../../app/routes/app.payment-rules";
import { authenticate } from "../../app/shopify.server";
import db from "../../app/db.server";
import { RuleStatus, ActionType } from "../../app/types/rules";

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
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../app/services/rules.server", () => ({
  syncPaymentRules: vi.fn().mockResolvedValue([]),
}));

describe("app.payment-rules route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loader returns list of payment rules", async () => {
    vi.mocked(authenticate.admin).mockResolvedValueOnce({
      admin: {} as any,
      session: { shop: "test-shop.myshopify.com" } as any,
      billing: {} as any,
    } as any);

    vi.mocked(db.paymentRule.findMany).mockResolvedValueOnce([
      { id: "p1", name: "COD Rule", status: RuleStatus.ACTIVE, paymentMethodName: "Cash on Delivery", actionType: ActionType.HIDE },
    ] as any);

    const response = await loader({
      request: new Request("https://example.com/app/payment-rules"),
      params: {},
      context: {},
    });

    const data = await response.json();
    expect(data.rules).toHaveLength(1);
    expect(data.isCreating).toBe(false);
  });

  it("action creates new payment rule", async () => {
    vi.mocked(authenticate.admin).mockResolvedValueOnce({
      admin: {} as any,
      session: { shop: "test-shop.myshopify.com" } as any,
      billing: {} as any,
    } as any);

    const formData = new FormData();
    formData.append("intent", "create");
    formData.append("name", "Hide COD > 200");
    formData.append("status", RuleStatus.ACTIVE);
    formData.append("minSubtotal", "200");
    formData.append("paymentMethodName", "Cash on Delivery");
    formData.append("actionType", ActionType.HIDE);

    const response = await action({
      request: new Request("https://example.com/app/payment-rules", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    });

    expect(response.status).toBe(302);
    expect(db.paymentRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shop: "test-shop.myshopify.com",
          name: "Hide COD > 200",
          minSubtotal: 200,
          paymentMethodName: "Cash on Delivery",
          actionType: ActionType.HIDE,
        }),
      })
    );
  });
});
