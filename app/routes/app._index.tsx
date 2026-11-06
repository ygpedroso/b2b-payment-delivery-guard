import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  useLoaderData,
  useSubmit,
  useNavigation,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  Banner,
  BlockStack,
  Text,
  Badge,
  InlineStack,
  DataTable,
  Box,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { requireBilling } from "../billing.server";
import db from "../db.server";
import { syncPaymentRules, syncDeliveryRules } from "../services/rules.server";
import { RuleStatus, RuleType } from "../types/rules";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session, billing } = await authenticate.admin(request);
  await requireBilling(billing, admin);

  const shop = session.shop;

  const [paymentRules, deliveryRules, setting] = await Promise.all([
    db.paymentRule.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
    }),
    db.deliveryRule.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
    }),
    db.customizationSetting.findUnique({
      where: { shop },
    }),
  ]);

  const activePaymentCount = paymentRules.filter((r) => r.status === RuleStatus.ACTIVE).length;
  const activeDeliveryCount = deliveryRules.filter((r) => r.status === RuleStatus.ACTIVE).length;

  return json({
    shop,
    paymentRules,
    deliveryRules,
    activePaymentCount,
    activeDeliveryCount,
    setting,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session, billing } = await authenticate.admin(request);
  await requireBilling(billing, admin);

  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");
  const ruleType = formData.get("ruleType");
  const ruleId = formData.get("ruleId") as string;

  if (intent === "toggle_status" && ruleId) {
    if (ruleType === RuleType.PAYMENT) {
      const current = await db.paymentRule.findUnique({ where: { id: ruleId } });
      if (current && current.shop === shop) {
        const nextStatus = current.status === RuleStatus.ACTIVE ? RuleStatus.DRAFT : RuleStatus.ACTIVE;
        await db.paymentRule.update({
          where: { id: ruleId },
          data: { status: nextStatus },
        });
        await syncPaymentRules(admin, shop);
      }
    } else if (ruleType === RuleType.DELIVERY) {
      const current = await db.deliveryRule.findUnique({ where: { id: ruleId } });
      if (current && current.shop === shop) {
        const nextStatus = current.status === RuleStatus.ACTIVE ? RuleStatus.DRAFT : RuleStatus.ACTIVE;
        await db.deliveryRule.update({
          where: { id: ruleId },
          data: { status: nextStatus },
        });
        await syncDeliveryRules(admin, shop);
      }
    }
    return json({ success: true });
  }

  return json({ success: false });
};

export default function Index() {
  const {
    paymentRules,
    deliveryRules,
    activePaymentCount,
    activeDeliveryCount,
  } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const handleToggle = (ruleType: RuleType, ruleId: string) => {
    submit(
      { intent: "toggle_status", ruleType, ruleId },
      { method: "post" }
    );
  };

  const paymentRows = paymentRules.map((rule) => [
    <Text key={rule.id} variant="bodyMd" fontWeight="bold" as="span">
      {rule.name}
    </Text>,
    <Badge
      key={`${rule.id}-status`}
      tone={rule.status === RuleStatus.ACTIVE ? "success" : "attention"}
    >
      {rule.status}
    </Badge>,
    <span key={`${rule.id}-target`}>{rule.paymentMethodName}</span>,
    <Badge key={`${rule.id}-action`}>{rule.actionType}</Badge>,
    <InlineStack key={`${rule.id}-ops`} gap="200">
      <Button
        size="slim"
        onClick={() => handleToggle(RuleType.PAYMENT, rule.id)}
        disabled={isSubmitting}
      >
        {rule.status === RuleStatus.ACTIVE ? "Disable" : "Enable"}
      </Button>
      <Button size="slim" url={`/app/payment-rules?edit=${rule.id}`}>
        Edit
      </Button>
    </InlineStack>,
  ]);

  const deliveryRows = deliveryRules.map((rule) => [
    <Text key={rule.id} variant="bodyMd" fontWeight="bold" as="span">
      {rule.name}
    </Text>,
    <Badge
      key={`${rule.id}-status`}
      tone={rule.status === RuleStatus.ACTIVE ? "success" : "attention"}
    >
      {rule.status}
    </Badge>,
    <span key={`${rule.id}-target`}>{rule.deliveryOptionName}</span>,
    <Badge key={`${rule.id}-action`}>{rule.actionType}</Badge>,
    <InlineStack key={`${rule.id}-ops`} gap="200">
      <Button
        size="slim"
        onClick={() => handleToggle(RuleType.DELIVERY, rule.id)}
        disabled={isSubmitting}
      >
        {rule.status === RuleStatus.ACTIVE ? "Disable" : "Enable"}
      </Button>
      <Button size="slim" url={`/app/delivery-rules?edit=${rule.id}`}>
        Edit
      </Button>
    </InlineStack>,
  ]);

  return (
    <Page
      title="B2B Payment & Delivery Guard"
      subtitle="Conditionally hide, reorder, and restrict checkout payment methods and delivery options"
      primaryAction={{
        content: "New Payment Rule",
        url: "/app/payment-rules?new=1",
      }}
      secondaryActions={[
        {
          content: "New Delivery Rule",
          url: "/app/delivery-rules?new=1",
        },
        {
          content: "View Guide",
          url: "/app/guide",
        },
      ]}
    >
      <BlockStack gap="500">
        <Banner title="Shopify Functions Active" tone="success">
          <p>
            Your payment and delivery rules run natively on Shopify Edge via WebAssembly with zero storefront latency impact.
          </p>
        </Banner>

        <Layout>
          {/* Key Metrics */}
          <Layout.Section>
            <InlineStack gap="400">
              <div style={{ flex: 1 }}>
                <Card>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm" tone="subdued">
                      Active Payment Rules
                    </Text>
                    <InlineStack align="space-between">
                      <Text as="p" variant="heading2xl">
                        {activePaymentCount}
                      </Text>
                      <Badge tone={activePaymentCount > 0 ? "success" : "info"}>
                        {activePaymentCount > 0 ? "Enforcing" : "None active"}
                      </Badge>
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Total rules configured: {paymentRules.length}
                    </Text>
                  </BlockStack>
                </Card>
              </div>

              <div style={{ flex: 1 }}>
                <Card>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm" tone="subdued">
                      Active Delivery Rules
                    </Text>
                    <InlineStack align="space-between">
                      <Text as="p" variant="heading2xl">
                        {activeDeliveryCount}
                      </Text>
                      <Badge tone={activeDeliveryCount > 0 ? "success" : "info"}>
                        {activeDeliveryCount > 0 ? "Enforcing" : "None active"}
                      </Badge>
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Total rules configured: {deliveryRules.length}
                    </Text>
                  </BlockStack>
                </Card>
              </div>
            </InlineStack>
          </Layout.Section>

          {/* Payment Rules Overview */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingMd">
                      Payment Customization Rules
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Conditionally hide or move payment gateways based on cart subtotal, B2B tags, and country.
                    </Text>
                  </BlockStack>
                  <Button variant="primary" url="/app/payment-rules?new=1">
                    Add Payment Rule
                  </Button>
                </InlineStack>

                {paymentRules.length === 0 ? (
                  <Box padding="400">
                    <BlockStack align="center" inlineAlign="center" gap="200">
                      <Text as="p" variant="bodyMd" tone="subdued">
                        No payment rules created yet. Create a rule to hide COD over $200 or restrict credit cards for wholesale buyers.
                      </Text>
                      <Button url="/app/payment-rules?new=1">Create First Payment Rule</Button>
                    </BlockStack>
                  </Box>
                ) : (
                  <DataTable
                    columnContentTypes={["text", "text", "text", "text", "text"]}
                    headings={["Rule Name", "Status", "Target Method", "Action", "Actions"]}
                    rows={paymentRows}
                  />
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Delivery Rules Overview */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingMd">
                      Delivery & Shipping Rules
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Hide parcel rates for freight products, restrict postal codes, and prioritize contracted B2B rates.
                    </Text>
                  </BlockStack>
                  <Button variant="primary" url="/app/delivery-rules?new=1">
                    Add Delivery Rule
                  </Button>
                </InlineStack>

                {deliveryRules.length === 0 ? (
                  <Box padding="400">
                    <BlockStack align="center" inlineAlign="center" gap="200">
                      <Text as="p" variant="bodyMd" tone="subdued">
                        No delivery rules created yet. Create a rule to hide standard parcel shipping when freight products are in cart.
                      </Text>
                      <Button url="/app/delivery-rules?new=1">Create First Delivery Rule</Button>
                    </BlockStack>
                  </Box>
                ) : (
                  <DataTable
                    columnContentTypes={["text", "text", "text", "text", "text"]}
                    headings={["Rule Name", "Status", "Target Option", "Action", "Actions"]}
                    rows={deliveryRows}
                  />
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Quick Guide & Info */}
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">
                  Popular B2B Use Cases
                </Text>
                <Divider />
                <InlineStack gap="600" wrap>
                  <div style={{ flex: 1, minWidth: "260px" }}>
                    <Text as="p" fontWeight="bold">
                      1. Restrict Cash on Delivery (COD)
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Hide COD if cart subtotal exceeds $200, preventing high-value non-payment risk.
                    </Text>
                  </div>
                  <div style={{ flex: 1, minWidth: "260px" }}>
                    <Text as="p" fontWeight="bold">
                      2. Force Net Terms for B2B Customers
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Hide Credit Cards and BNPL (Klarna/Affirm) for buyers tagged with <code>b2b</code> or <code>wholesale</code>.
                    </Text>
                  </div>
                  <div style={{ flex: 1, minWidth: "260px" }}>
                    <Text as="p" fontWeight="bold">
                      3. Require Freight Shipping for Heavy Items
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Hide Express & Standard parcel options when items tagged with <code>freight</code> are in cart.
                    </Text>
                  </div>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
