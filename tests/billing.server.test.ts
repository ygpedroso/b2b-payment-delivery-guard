import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isTestCharge, requireBilling, PRO_PLAN } from "../app/billing.server";

describe("billing.server", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("isTestCharge", () => {
    it("returns true when NODE_ENV is not production", async () => {
      process.env.NODE_ENV = "development";
      const mockAdmin = { graphql: vi.fn() } as any;

      const result = await isTestCharge(mockAdmin);

      expect(result).toBe(true);
      expect(mockAdmin.graphql).not.toHaveBeenCalled();
    });

    it("returns true when SHOPIFY_BILLING_IS_TEST is 'true' even in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.SHOPIFY_BILLING_IS_TEST = "true";
      const mockAdmin = { graphql: vi.fn() } as any;

      const result = await isTestCharge(mockAdmin);

      expect(result).toBe(true);
      expect(mockAdmin.graphql).not.toHaveBeenCalled();
    });

    it("returns false in production when admin context is missing", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.SHOPIFY_BILLING_IS_TEST;

      const result = await isTestCharge(undefined);

      expect(result).toBe(false);
    });

    it("returns true in production when shop plan has partnerDevelopment: true", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.SHOPIFY_BILLING_IS_TEST;

      const mockAdmin = {
        graphql: vi.fn().mockResolvedValue({
          json: async () => ({
            data: {
              shop: {
                plan: {
                  partnerDevelopment: true,
                },
              },
            },
          }),
        }),
      } as any;

      const result = await isTestCharge(mockAdmin);

      expect(result).toBe(true);
      expect(mockAdmin.graphql).toHaveBeenCalledWith(
        expect.stringContaining("partnerDevelopment")
      );
    });

    it("returns false in production for live merchants where partnerDevelopment is false", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.SHOPIFY_BILLING_IS_TEST;

      const mockAdmin = {
        graphql: vi.fn().mockResolvedValue({
          json: async () => ({
            data: {
              shop: {
                plan: {
                  partnerDevelopment: false,
                },
              },
            },
          }),
        }),
      } as any;

      const result = await isTestCharge(mockAdmin);

      expect(result).toBe(false);
      expect(mockAdmin.graphql).toHaveBeenCalledWith(
        expect.stringContaining("partnerDevelopment")
      );
    });

    it("defaults to true for safety when GraphQL query fails", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.SHOPIFY_BILLING_IS_TEST;

      const mockAdmin = {
        graphql: vi.fn().mockRejectedValue(new Error("Network timeout")),
      } as any;

      const result = await isTestCharge(mockAdmin);

      expect(result).toBe(true);
    });
  });

  describe("requireBilling", () => {
    it("calls billing.require with PRO_PLAN and dynamic isTest flag", async () => {
      process.env.NODE_ENV = "development";

      const mockBilling = {
        require: vi.fn().mockResolvedValue({ hasActivePayment: true }),
        request: vi.fn(),
      };

      await requireBilling(mockBilling);

      expect(mockBilling.require).toHaveBeenCalledWith(
        expect.objectContaining({
          plans: [PRO_PLAN],
          isTest: true,
        })
      );
    });

    it("triggers billing.request with isTest flag when onFailure callback is invoked", async () => {
      process.env.NODE_ENV = "development";

      let capturedOnFailure: (() => Promise<any>) | undefined;
      const mockBilling = {
        require: vi.fn().mockImplementation(({ onFailure }) => {
          capturedOnFailure = onFailure;
          return { hasActivePayment: false };
        }),
        request: vi.fn().mockResolvedValue({ confirmationUrl: "https://example.com/confirm" }),
      };

      await requireBilling(mockBilling);

      expect(capturedOnFailure).toBeDefined();
      if (capturedOnFailure) {
        await capturedOnFailure();
        expect(mockBilling.request).toHaveBeenCalledWith({
          plan: PRO_PLAN,
          isTest: true,
        });
      }
    });
  });
});
