import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

export const PRO_PLAN = "b2b-pro-monthly";

interface ShopPlanResponse {
  data?: {
    shop?: {
      plan?: {
        partnerDevelopment?: boolean;
      };
    };
  };
}

/**
 * Determines whether a store should receive a test charge (`isTest: true`).
 * Returns true if:
 * 1. The store is explicitly a Shopify Partner Development store (`plan.partnerDevelopment === true`), OR
 * 2. `NODE_ENV` is not production, OR
 * 3. An override environment variable `SHOPIFY_BILLING_IS_TEST=true` is present.
 */
export async function isTestCharge(
  admin?: AdminApiContext
): Promise<boolean> {
  if (process.env.NODE_ENV !== "production" || process.env.SHOPIFY_BILLING_IS_TEST === "true") {
    return true;
  }

  if (!admin) {
    return false;
  }

  try {
    const response = await admin.graphql(
      `#graphql
        query getShopPlan {
          shop {
            plan {
              partnerDevelopment
            }
          }
        }
      `
    );

    const json = (await response.json()) as ShopPlanResponse;
    return Boolean(json.data?.shop?.plan?.partnerDevelopment);
  } catch (error) {
    console.error("Failed to fetch shop plan for billing detection, defaulting to true for safety:", error);
    // Fail-safe to avoid blocking review submissions on network blips
    return true;
  }
}

/**
 * Enforces billing requirement using dynamic development store detection.
 */
export async function requireBilling(
  billing: any,
  admin?: AdminApiContext
) {
  const isTest = await isTestCharge(admin);

  return billing.require({
    plans: [PRO_PLAN],
    isTest,
    onFailure: async () =>
      billing.request({
        plan: PRO_PLAN,
        isTest,
      }),
  });
}
