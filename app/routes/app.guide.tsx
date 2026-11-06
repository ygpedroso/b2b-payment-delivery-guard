import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Divider,
  List,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { requireBilling } from "../billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, billing } = await authenticate.admin(request);
  await requireBilling(billing, admin);

  return json({});
};

export default function Guide() {
  return (
    <Page
      title="User Guide & Best Practices"
      subtitle="How to configure and test B2B Payment and Delivery customization rules"
    >
      <BlockStack gap="500">
        <Banner title="Native Checkout Architecture" tone="info">
          <p>
            Unlike legacy script apps or theme liquid hacks, B2B Payment & Delivery Guard uses Shopify Functions compiled to WebAssembly (WASM). Your rules execute directly on Shopify checkout infrastructure before checkout options are rendered to buyers.
          </p>
        </Banner>

        <Layout>
          {/* Payment Customization Guide */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  1. Payment Customization Recipes
                </Text>
                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Recipe A: Hide Cash on Delivery (COD) for Large Orders
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Prevents non-payment risks by removing COD when the order exceeds a safe threshold.
                  </Text>
                  <List type="bullet">
                    <List.Item>Set <strong>Minimum Subtotal ($)</strong> to <code>200.00</code>.</List.Item>
                    <List.Item>Set <strong>Target Payment Method Name</strong> to <code>Cash on Delivery</code>.</List.Item>
                    <List.Item>Set <strong>Action</strong> to <code>Hide Method</code>.</List.Item>
                  </List>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Recipe B: Force Bank Transfer / Net Terms for Wholesale Accounts
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Ensures wholesale buyers cannot pay via credit card or installment services (Klarna/Affirm), saving 2.9%+ processing fees.
                  </Text>
                  <List type="bullet">
                    <List.Item>Set <strong>Customer Tags</strong> to <code>wholesale, b2b, net-terms</code>.</List.Item>
                    <List.Item>Set <strong>Tag Match Mode</strong> to <code>Matches ANY tag</code>.</List.Item>
                    <List.Item>Create a rule hiding <code>Credit Card</code> and another hiding <code>Klarna</code>.</List.Item>
                  </List>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Delivery Customization Guide */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  2. Delivery & Shipping Recipes
                </Text>
                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Recipe A: Restrict Parcel Shipping When Freight Items are in Cart
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Ensures oversized or heavy items cannot be shipped via cheap standard or express parcel carriers.
                  </Text>
                  <List type="bullet">
                    <List.Item>Tag your heavy or oversized products in Shopify Admin with <code>freight</code> or <code>heavy</code>.</List.Item>
                    <List.Item>Set <strong>Product Tags</strong> in the rule builder to <code>freight</code>.</List.Item>
                    <List.Item>Set <strong>Target Delivery Option Name</strong> to <code>Express</code> or <code>Standard</code>.</List.Item>
                    <List.Item>Set <strong>Action</strong> to <code>Hide Option</code>.</List.Item>
                  </List>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Recipe B: Postal Code / Remote Zone Filter
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Block standard rates or PO Box delivery for specific geographic zones.
                  </Text>
                  <List type="bullet">
                    <List.Item>Set <strong>Postal Code Match Type</strong> to <code>Prefix Match</code>.</List.Item>
                    <List.Item>Enter postal prefixes separated by commas: <code>995, 996, 997, 998, 999</code> (Alaska).</List.Item>
                    <List.Item>Hide standard rates or surface freight to force appropriate remote transport.</List.Item>
                  </List>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Recipe C: Prioritize Contracted B2B Freight Rates
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Move your negotiated B2B carrier rate to the top of the shipping selector for faster checkout.
                  </Text>
                  <List type="bullet">
                    <List.Item>Set <strong>Target Delivery Option Name</strong> to <code>B2B Freight</code> or your carrier name.</List.Item>
                    <List.Item>Set <strong>Action</strong> to <code>Move to Top (Prioritize)</code>.</List.Item>
                  </List>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Testing Guide */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  3. How to Test Your Rules
                </Text>
                <Divider />

                <List type="number">
                  <List.Item>
                    <strong>Tag Test Customers:</strong> Go to <strong>Shopify Admin &rarr; Customers</strong> and add tags such as <code>wholesale</code> or <code>b2b</code> to your test customer accounts.
                  </List.Item>
                  <List.Item>
                    <strong>Tag Test Products:</strong> Go to <strong>Shopify Admin &rarr; Products</strong> and add tags such as <code>freight</code> or <code>heavy</code> to items you want to test.
                  </List.Item>
                  <List.Item>
                    <strong>Open Storefront Checkout:</strong> Add items to your cart and proceed to checkout. Log in with your test customer account to verify payment restrictions, or enter shipping addresses with test zip codes to verify delivery rules.
                  </List.Item>
                </List>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
