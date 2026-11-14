import db from "../db.server";
import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { RuleStatus, PostalCodeType, ActionType } from "../types/rules";

export interface SerializedPaymentRule {
  id: string;
  name: string;
  status: RuleStatus | string;
  priority: number;
  minSubtotal: number | null;
  maxSubtotal: number | null;
  customerTags: string[];
  customerTagsMatch: "ANY" | "ALL";
  countryCodes: string[];
  currencies: string[];
  productTags: string[];
  productIds: string[];
  paymentMethodName: string;
  actionType: ActionType | string;
}

export interface SerializedDeliveryRule {
  id: string;
  name: string;
  status: RuleStatus | string;
  priority: number;
  minTotalAmount: number | null;
  maxTotalAmount: number | null;
  minTotalWeight: number | null;
  maxTotalWeight: number | null;
  postalCodes: string[];
  postalCodeType: PostalCodeType | string;
  countryCodes: string[];
  provinceCodes: string[];
  productTags: string[];
  deliveryOptionName: string;
  actionType: ActionType | string;
}

export function parseCommaSeparated(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Synchronizes active payment rules with Shopify Admin GraphQL API and Metafields.
 */
export async function syncPaymentRules(admin: AdminApiContext, shop: string) {
  const activeRules = await db.paymentRule.findMany({
    where: { shop, status: RuleStatus.ACTIVE },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });

  const serializedRules: SerializedPaymentRule[] = activeRules.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    priority: r.priority ?? 3,
    minSubtotal: r.minSubtotal,
    maxSubtotal: r.maxSubtotal,
    customerTags: parseCommaSeparated(r.customerTags),
    customerTagsMatch: (r.customerTagsMatch as "ANY" | "ALL") || "ANY",
    countryCodes: parseCommaSeparated(r.countryCodes).map((c) => c.toUpperCase()),
    currencies: parseCommaSeparated(r.currencies).map((c) => c.toUpperCase()),
    productTags: parseCommaSeparated(r.productTags),
    productIds: parseCommaSeparated(r.productIds),
    paymentMethodName: r.paymentMethodName,
    actionType: (r.actionType as ActionType) || ActionType.HIDE,
  }));

  const configPayload = {
    rules: serializedRules,
    updatedAt: new Date().toISOString(),
  };

  try {
    // 1. Get Shop ID for Shop Metafield
    const shopResponse = await admin.graphql(
      `#graphql
        query getShop {
          shop {
            id
          }
        }
      `
    );
    const shopData = await shopResponse.json();
    const shopId = shopData?.data?.shop?.id;

    if (shopId) {
      await admin.graphql(
        `#graphql
          mutation SetPaymentMetafield($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                id
                key
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        {
          variables: {
            metafields: [
              {
                ownerId: shopId,
                namespace: "b2b_payment_guard",
                key: "rules",
                type: "json",
                value: JSON.stringify(configPayload),
              },
            ],
          },
        }
      );
    }

    // 2. Register or Update Payment Customization
    let setting = await db.customizationSetting.findUnique({
      where: { shop },
    });

    if (!setting) {
      setting = await db.customizationSetting.create({
        data: { shop },
      });
    }

    let shouldCreatePayment = !setting.paymentCustomizationId;

    if (setting.paymentCustomizationId) {
      // Try to update existing customization
      const updateResponse = await admin.graphql(
        `#graphql
          mutation PaymentCustomizationUpdate($id: ID!, $paymentCustomization: PaymentCustomizationInput!) {
            paymentCustomizationUpdate(id: $id, paymentCustomization: $paymentCustomization) {
              paymentCustomization {
                id
                enabled
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        {
          variables: {
            id: setting.paymentCustomizationId,
            paymentCustomization: {
              enabled: serializedRules.length > 0,
              metafields: [
                {
                  namespace: "$app:payment_rules",
                  key: "configuration",
                  type: "json",
                  value: JSON.stringify(configPayload),
                },
              ],
            },
          },
        }
      );

      const updateData = await updateResponse.json();
      const userErrors = updateData?.data?.paymentCustomizationUpdate?.userErrors ?? [];
      const updatedId = updateData?.data?.paymentCustomizationUpdate?.paymentCustomization?.id;

      if (!updatedId || userErrors.length > 0) {
        console.warn(
          "[B2B Payment Guard] PaymentCustomizationUpdate failed (customization likely removed on uninstall). Will re-create.",
          userErrors
        );
        shouldCreatePayment = true;
        await db.customizationSetting.update({
          where: { shop },
          data: { paymentCustomizationId: null },
        });
      } else {
        console.log("[B2B Payment Guard] PaymentCustomization updated successfully:", updatedId);
      }
    }

    if (shouldCreatePayment) {
      const createResponse = await admin.graphql(
        `#graphql
          mutation PaymentCustomizationCreate($paymentCustomization: PaymentCustomizationInput!) {
            paymentCustomizationCreate(paymentCustomization: $paymentCustomization) {
              paymentCustomization {
                id
                title
                enabled
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        {
          variables: {
            paymentCustomization: {
              title: "B2B Payment Guard",
              enabled: true,
              functionHandle: "payment-customization",
              metafields: [
                {
                  namespace: "$app:payment_rules",
                  key: "configuration",
                  type: "json",
                  value: JSON.stringify(configPayload),
                },
              ],
            },
          },
        }
      );

      const createData = await createResponse.json();
      const userErrors = createData?.data?.paymentCustomizationCreate?.userErrors ?? [];
      const newId = createData?.data?.paymentCustomizationCreate?.paymentCustomization?.id;

      if (newId) {
        console.log("[B2B Payment Guard] PaymentCustomization created successfully:", newId);
        await db.customizationSetting.update({
          where: { shop },
          data: { paymentCustomizationId: newId },
        });
      } else {
        console.error("[B2B Payment Guard] PaymentCustomizationCreate failed with userErrors:", userErrors);
      }
    }
  } catch (error) {
    console.error("Failed to sync payment rules with Shopify:", error);
  }

  return serializedRules;
}

/**
 * Synchronizes active delivery rules with Shopify Admin GraphQL API and Metafields.
 */
export async function syncDeliveryRules(admin: AdminApiContext, shop: string) {
  const activeRules = await db.deliveryRule.findMany({
    where: { shop, status: RuleStatus.ACTIVE },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });

  const serializedRules: SerializedDeliveryRule[] = activeRules.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    priority: r.priority ?? 3,
    minTotalAmount: r.minTotalAmount,
    maxTotalAmount: r.maxTotalAmount,
    minTotalWeight: r.minTotalWeight,
    maxTotalWeight: r.maxTotalWeight,
    postalCodes: parseCommaSeparated(r.postalCodes),
    postalCodeType: (r.postalCodeType as PostalCodeType) || PostalCodeType.PREFIX,
    countryCodes: parseCommaSeparated(r.countryCodes).map((c) => c.toUpperCase()),
    provinceCodes: parseCommaSeparated(r.provinceCodes).map((p) => p.toUpperCase()),
    productTags: parseCommaSeparated(r.productTags),
    deliveryOptionName: r.deliveryOptionName,
    actionType: (r.actionType as ActionType) || ActionType.HIDE,
  }));

  const configPayload = {
    rules: serializedRules,
    updatedAt: new Date().toISOString(),
  };

  try {
    // 1. Get Shop ID for Shop Metafield
    const shopResponse = await admin.graphql(
      `#graphql
        query getShop {
          shop {
            id
          }
        }
      `
    );
    const shopData = await shopResponse.json();
    const shopId = shopData?.data?.shop?.id;

    if (shopId) {
      await admin.graphql(
        `#graphql
          mutation SetDeliveryMetafield($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                id
                key
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        {
          variables: {
            metafields: [
              {
                ownerId: shopId,
                namespace: "b2b_delivery_guard",
                key: "rules",
                type: "json",
                value: JSON.stringify(configPayload),
              },
            ],
          },
        }
      );
    }

    // 2. Register or Update Delivery Customization
    let setting = await db.customizationSetting.findUnique({
      where: { shop },
    });

    if (!setting) {
      setting = await db.customizationSetting.create({
        data: { shop },
      });
    }

    let shouldCreateDelivery = !setting.deliveryCustomizationId;

    if (setting.deliveryCustomizationId) {
      // Try to update existing customization
      const updateResponse = await admin.graphql(
        `#graphql
          mutation DeliveryCustomizationUpdate($id: ID!, $deliveryCustomization: DeliveryCustomizationInput!) {
            deliveryCustomizationUpdate(id: $id, deliveryCustomization: $deliveryCustomization) {
              deliveryCustomization {
                id
                enabled
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        {
          variables: {
            id: setting.deliveryCustomizationId,
            deliveryCustomization: {
              enabled: serializedRules.length > 0,
              metafields: [
                {
                  namespace: "$app:delivery_rules",
                  key: "configuration",
                  type: "json",
                  value: JSON.stringify(configPayload),
                },
              ],
            },
          },
        }
      );

      const updateData = await updateResponse.json();
      const userErrors = updateData?.data?.deliveryCustomizationUpdate?.userErrors ?? [];
      const updatedId = updateData?.data?.deliveryCustomizationUpdate?.deliveryCustomization?.id;

      if (!updatedId || userErrors.length > 0) {
        console.warn(
          "[B2B Delivery Guard] DeliveryCustomizationUpdate failed (customization likely removed on uninstall). Will re-create.",
          userErrors
        );
        shouldCreateDelivery = true;
        await db.customizationSetting.update({
          where: { shop },
          data: { deliveryCustomizationId: null },
        });
      } else {
        console.log("[B2B Delivery Guard] DeliveryCustomization updated successfully:", updatedId);
      }
    }

    if (shouldCreateDelivery) {
      const createResponse = await admin.graphql(
        `#graphql
          mutation DeliveryCustomizationCreate($deliveryCustomization: DeliveryCustomizationInput!) {
            deliveryCustomizationCreate(deliveryCustomization: $deliveryCustomization) {
              deliveryCustomization {
                id
                title
                enabled
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        {
          variables: {
            deliveryCustomization: {
              title: "B2B Delivery Guard",
              enabled: true,
              functionHandle: "delivery-customization",
              metafields: [
                {
                  namespace: "$app:delivery_rules",
                  key: "configuration",
                  type: "json",
                  value: JSON.stringify(configPayload),
                },
              ],
            },
          },
        }
      );

      const createData = await createResponse.json();
      const userErrors = createData?.data?.deliveryCustomizationCreate?.userErrors ?? [];
      const newId = createData?.data?.deliveryCustomizationCreate?.deliveryCustomization?.id;

      if (newId) {
        console.log("[B2B Delivery Guard] DeliveryCustomization created successfully:", newId);
        await db.customizationSetting.update({
          where: { shop },
          data: { deliveryCustomizationId: newId },
        });
      } else {
        console.error("[B2B Delivery Guard] DeliveryCustomizationCreate failed with userErrors:", userErrors);
      }
    }
  } catch (error) {
    console.error("Failed to sync delivery rules with Shopify:", error);
  }

  return serializedRules;
}
