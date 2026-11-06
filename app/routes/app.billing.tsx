import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Badge,
  InlineStack,
  List,
  Banner,
  Divider,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { PRO_PLAN, isTestCharge, requireBilling } from "../billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session, billing } = await authenticate.admin(request);
  await requireBilling(billing, admin);

  const isTest = await isTestCharge(admin);

  let hasActiveSubscription = true;
  try {
    const billingCheck = await billing.check({
      plans: [PRO_PLAN],
      isTest,
    });
    hasActiveSubscription = Boolean(billingCheck?.hasActivePayment);
  } catch {
    hasActiveSubscription = true;
  }

  return json({
    shop: session.shop,
    isTest,
    hasActiveSubscription,
  });
};

export default function Billing() {
  const { shop, isTest, hasActiveSubscription } = useLoaderData<typeof loader>();

  return (
    <Page
      title="Plan & Billing"
      subtitle="Manage your Fastloom Labs subscription and features"
    >
      <BlockStack gap="500">
        <Banner title="Single Transparent Plan" tone="info">
          <p>
            B2B Payment & Delivery Guard operates on a single all-inclusive subscription tier. All rules, conditions, and future updates are unlocked with no per-transaction charges.
          </p>
        </Banner>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingLg">
                      B2B Pro Monthly
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Fastloom Labs • High-Performance Checkout Guard
                    </Text>
                  </BlockStack>
                  <Badge tone={hasActiveSubscription ? "success" : "attention"}>
                    {hasActiveSubscription
                      ? isTest
                        ? "Partner Dev Store (Free)"
                        : "Active Subscription"
                      : "Subscription Pending"}
                  </Badge>
                </InlineStack>

                <Divider />

                <InlineStack align="start" blockAlign="baseline" gap="200">
                  <Text as="p" variant="heading2xl">
                    $14.99
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    / month (USD)
                  </Text>
                </InlineStack>

                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Includes a 14-day risk-free trial. Cancel anytime directly in Shopify Admin.
                </Text>

                <Divider />

                <Text as="h3" variant="headingSm">
                  What's Included:
                </Text>

                <List type="bullet">
                  <List.Item>
                    <strong>Payment Customization Function:</strong> Conditionally hide, rename, and reorder payment gateways based on cart subtotal, B2B customer tags, and country code.
                  </List.Item>
                  <List.Item>
                    <strong>Delivery Customization Function:</strong> Hide parcel shipping for freight/heavy products, restrict delivery by postal code prefix or regex, and prioritize B2B carrier rates.
                  </List.Item>
                  <List.Item>
                    <strong>Shopify Edge (WebAssembly):</strong> 100% pure Function execution with sub-millisecond checkout response times and zero storefront JavaScript bundle bloat.
                  </List.Item>
                  <List.Item>
                    <strong>Unlimited Rules:</strong> Create as many conditional rules as your store requires with no per-order fees or throttling.
                  </List.Item>
                  <List.Item>
                    <strong>Priority Support:</strong> Direct support from Fastloom Labs developers.
                  </List.Item>
                </List>

                <Divider />

                <Box padding="200">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Current Store: <strong>{shop}</strong>
                  </Text>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
