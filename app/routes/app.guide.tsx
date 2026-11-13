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
                    Recipe A: Hide Cash on Delivery (COD) for High-Value Orders
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Prevents non-payment and courier refusal risks by removing COD when the order subtotal exceeds a safe threshold.
                  </Text>
                  <List type="bullet">
                    <List.Item>Set <strong>Minimum Subtotal ($)</strong> to <code>200.00</code>.</List.Item>
                    <List.Item>Set <strong>Target Payment Method Name</strong> to <code>Cash on Delivery</code>.</List.Item>
                    <List.Item>Set <strong>Action</strong> to <code>Hide Method</code>.</List.Item>
                    <List.Item>Set <strong>Priority</strong> to <code>High</code>.</List.Item>
                  </List>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Recipe B: Hide Buy-Now-Pay-Later (Klarna, Affirm) for B2B Accounts
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Wholesale buyers purchase in high volumes at negotiated margins. Prevent high installment provider processing fees (4–6%) for tagged wholesale accounts.
                  </Text>
                  <List type="bullet">
                    <List.Item>Set <strong>Customer Tags</strong> to <code>wholesale, b2b, net-terms</code>.</List.Item>
                    <List.Item>Set <strong>Tag Match Mode</strong> to <code>Matches ANY tag</code>.</List.Item>
                    <List.Item>Set <strong>Target Payment Method Name</strong> to <code>Klarna, Affirm</code>.</List.Item>
                    <List.Item>Set <strong>Action</strong> to <code>Hide Method</code>.</List.Item>
                    <List.Item>Set <strong>Priority</strong> to <code>High</code>.</List.Item>
                  </List>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Recipe C: Deprioritize (Move to Bottom) Money Order or Check
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Move slow, manual paper payment options to the bottom of checkout so buyers default to faster electronic payment methods.
                  </Text>
                  <List type="bullet">
                    <List.Item>Set <strong>Country Codes</strong> to <code>US, CA</code>.</List.Item>
                    <List.Item>Set <strong>Target Payment Method Name</strong> to <code>Money Order, Check</code>.</List.Item>
                    <List.Item>Set <strong>Action</strong> to <code>Move to Bottom</code>.</List.Item>
                    <List.Item>Set <strong>Priority</strong> to <code>Low</code>.</List.Item>
                  </List>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Recipe D: Restrict Cash on Delivery (COD) for International Orders
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Cross-border logistics and customs make COD unviable internationally. Restrict COD for foreign shipping destinations.
                  </Text>
                  <List type="bullet">
                    <List.Item>Set <strong>Country Codes</strong> to <code>GB, FR, DE, AU</code>.</List.Item>
                    <List.Item>Set <strong>Target Payment Method Name</strong> to <code>Cash on Delivery</code>.</List.Item>
                    <List.Item>Set <strong>Action</strong> to <code>Hide Method</code>.</List.Item>
                    <List.Item>Set <strong>Priority</strong> to <code>Highest</code>.</List.Item>
                  </List>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Recipe E: Restrict Manual Bank Transfer on Small Orders
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Avoid manual bank reconciliation overhead on low-value retail purchases by restricting wire/bank transfers below a minimum checkout amount.
                  </Text>
                  <List type="bullet">
                    <List.Item>Set <strong>Maximum Subtotal ($)</strong> to <code>50.00</code>.</List.Item>
                    <List.Item>Set <strong>Target Payment Method Name</strong> to <code>Bank Deposit, Wire Transfer</code>.</List.Item>
                    <List.Item>Set <strong>Action</strong> to <code>Hide Method</code>.</List.Item>
                    <List.Item>Set <strong>Priority</strong> to <code>Medium</code>.</List.Item>
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
                    Ensures oversized, heavy, or palletized products cannot be checked out with standard parcel carriers.
                  </Text>
                  <List type="bullet">
                    <List.Item>Tag heavy products in Shopify Admin with <code>freight</code> or <code>heavy</code>.</List.Item>
                    <List.Item>Set <strong>Product Tags</strong> in the rule builder to <code>freight</code>.</List.Item>
                    <List.Item>Set <strong>Target Delivery Option Name</strong> to <code>Express, Standard Ground</code>.</List.Item>
                    <List.Item>Set <strong>Action</strong> to <code>Hide Option</code>.</List.Item>
                    <List.Item>Set <strong>Priority</strong> to <code>Highest</code>.</List.Item>
                  </List>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Recipe B: Block Express Air Shipping for PO Box Addresses
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Commercial air couriers (FedEx/UPS Express) cannot deliver to PO Boxes. Enforce carrier compliance automatically.
                  </Text>
                  <List type="bullet">
                    <List.Item>Set <strong>Postal Code Match Type</strong> to <code>Regex Match</code>.</List.Item>
                    <List.Item>Set <strong>Postal Code / Zip Filter</strong> to <code>P\.?O\.?\s?BOX</code>.</List.Item>
                    <List.Item>Set <strong>Target Delivery Option Name</strong> to <code>Express, Overnight, 2-Day Air</code>.</List.Item>
                    <List.Item>Set <strong>Action</strong> to <code>Hide Option</code>.</List.Item>
                    <List.Item>Set <strong>Priority</strong> to <code>High</code>.</List.Item>
                  </List>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Recipe C: Restrict Standard Ground Transport for Remote Postal Codes
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Standard road shipping cannot reach remote offshore territories or polar regions.
                  </Text>
                  <List type="bullet">
                    <List.Item>Set <strong>Postal Code Match Type</strong> to <code>Prefix Match</code>.</List.Item>
                    <List.Item>Enter postal prefixes separated by commas: <code>995, 996, 997, 998, 999</code> (Alaska) or <code>X0A, X0B</code> (Northern Canada).</List.Item>
                    <List.Item>Set <strong>Target Delivery Option Name</strong> to <code>Standard Ground, Economy</code>.</List.Item>
                    <List.Item>Set <strong>Action</strong> to <code>Hide Option</code>.</List.Item>
                    <List.Item>Set <strong>Priority</strong> to <code>High</code>.</List.Item>
                  </List>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Recipe D: Prioritize Contracted B2B Freight Rates (Move to Top)
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Move negotiated corporate freight rates to the top of the shipping selector for faster B2B checkout.
                  </Text>
                  <List type="bullet">
                    <List.Item>Set <strong>Target Delivery Option Name</strong> to <code>B2B Freight, LTL</code>.</List.Item>
                    <List.Item>Set <strong>Action</strong> to <code>Move to Top (Prioritize)</code>.</List.Item>
                    <List.Item>Set <strong>Priority</strong> to <code>Medium</code>.</List.Item>
                  </List>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Recipe E: Deprioritize (Move to Bottom) Economy Shipping for Heavy Carts
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Heavy consignments require robust courier handling. Move un-tracked or slow economy shipping to the bottom of the list.
                  </Text>
                  <List type="bullet">
                    <List.Item>Set <strong>Minimum Cart Weight (lbs)</strong> to <code>70</code>.</List.Item>
                    <List.Item>Set <strong>Target Delivery Option Name</strong> to <code>Economy, Super Saver</code>.</List.Item>
                    <List.Item>Set <strong>Action</strong> to <code>Move to Bottom</code>.</List.Item>
                    <List.Item>Set <strong>Priority</strong> to <code>Low</code>.</List.Item>
                  </List>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Rule Priority & Conflict Resolution */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  3. Rule Priority & Conflict Resolution
                </Text>
                <Divider />

                <Text as="p" variant="bodyMd">
                  When you have multiple rules that match the same payment method or delivery option, priorities ensure predictable execution and prevent conflicting actions.
                </Text>

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Priority Tiers
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Each rule can be assigned one of five priority levels:
                  </Text>
                  <List type="bullet">
                    <List.Item><strong>Highest:</strong> Urgent overrides, emergency restrictions, or critical safety rules.</List.Item>
                    <List.Item><strong>High:</strong> Key wholesale compliance and contractual requirements.</List.Item>
                    <List.Item><strong>Medium (Default):</strong> Standard day-to-day business policies.</List.Item>
                    <List.Item><strong>Low:</strong> Secondary reordering preferences.</List.Item>
                    <List.Item><strong>Lowest:</strong> Fallback presentation adjustments.</List.Item>
                  </List>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    The Authoritative Rule: Hide Always Beats Move
                  </Text>
                  <Text as="p" variant="bodyMd">
                    A <strong>Hide</strong> action represents a legal, risk, or operational constraint (e.g., hazardous materials cannot ship via air, or Cash on Delivery is disallowed for remote international orders). Consequently:
                  </Text>
                  <List type="bullet">
                    <List.Item>If any matching rule specifies <strong>Hide</strong>, that target is hidden. A <strong>Move</strong> action can never un-hide or surface a hidden option.</List.Item>
                    <List.Item>If multiple <strong>Move</strong> actions target the same option (e.g., Move to Top vs. Move to Bottom), the rule with the higher priority level wins.</List.Item>
                    <List.Item>Rules are evaluated in order from <strong>Highest</strong> to <strong>Lowest</strong> priority.</List.Item>
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
                  4. How to Test Your Rules
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
