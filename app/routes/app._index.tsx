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
  ButtonGroup,
  Banner,
  BlockStack,
  Text,
  Badge,
  InlineStack,
  IndexTable,
  Box,
  Divider,
  Thumbnail,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { requireBilling } from "../billing.server";
import db from "../db.server";
import { syncPaymentRules, syncDeliveryRules } from "../services/rules.server";
import {
  RuleStatus,
  RuleType,
  ActionType,
  getPriorityLabel,
  getPriorityBadgeTone,
} from "../types/rules";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session, billing } = await authenticate.admin(request);
  await requireBilling(billing, admin);

  const shop = session.shop;

  const [paymentRules, deliveryRules, setting] = await Promise.all([
    db.paymentRule.findMany({
      where: { shop },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    }),
    db.deliveryRule.findMany({
      where: { shop },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    }),
    db.customizationSetting.findUnique({
      where: { shop },
    }),
  ]);

  const activePaymentCount = paymentRules.filter((r) => r.status === RuleStatus.ACTIVE).length;
  const activeDeliveryCount = deliveryRules.filter((r) => r.status === RuleStatus.ACTIVE).length;

  // Auto-sync / self-heal on dashboard load to ensure customizations are registered in Shopify checkout
  if (activePaymentCount > 0 || !setting?.paymentCustomizationId) {
    await syncPaymentRules(admin, shop);
  }
  if (activeDeliveryCount > 0 || !setting?.deliveryCustomizationId) {
    await syncDeliveryRules(admin, shop);
  }

  const updatedSetting = await db.customizationSetting.findUnique({
    where: { shop },
  });

  return json({
    shop,
    paymentRules,
    deliveryRules,
    activePaymentCount,
    activeDeliveryCount,
    setting: updatedSetting,
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

  return (
    <Page
      title="B2B Payment & Delivery Guard"
      titleMetadata={
        <InlineStack gap="200" align="center">
          <Thumbnail
            source="/app-icon.png"
            alt="B2B Payment & Delivery Guard"
            size="small"
          />
          <Badge tone="success">Pro Plan Active</Badge>
        </InlineStack>
      }
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
            <Card padding="0">
              <Box padding="400">
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
              </Box>
              <Divider />

              {paymentRules.length === 0 ? (
                <Box padding="600">
                  <BlockStack align="center" inlineAlign="center" gap="200">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No payment rules created yet. Create a rule to hide COD over $200 or restrict installment methods for wholesale buyers.
                    </Text>
                    <Button url="/app/payment-rules?new=1">Create First Payment Rule</Button>
                  </BlockStack>
                </Box>
              ) : (
                <IndexTable
                  resourceName={{ singular: "payment rule", plural: "payment rules" }}
                  itemCount={paymentRules.length}
                  selectable={false}
                  headings={[
                    { title: "Rule Name" },
                    { title: "Status" },
                    { title: "Priority" },
                    { title: "Target Methods" },
                    { title: "Action" },
                    { title: "Actions", alignment: "end" },
                  ]}
                >
                  {paymentRules.map((rule, index) => (
                    <IndexTable.Row id={rule.id} key={rule.id} position={index}>
                      <IndexTable.Cell>
                        <Text variant="bodyMd" fontWeight="bold" as="span">
                          {rule.name}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Badge tone={rule.status === RuleStatus.ACTIVE ? "success" : "attention"}>
                          {rule.status}
                        </Badge>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Badge tone={getPriorityBadgeTone(rule.priority)}>
                          {getPriorityLabel(rule.priority)}
                        </Badge>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <div style={{ maxWidth: "320px" }}>
                          <InlineStack gap="100" wrap>
                            {rule.paymentMethodName
                              .split(",")
                              .map((t: string) => t.trim())
                              .filter(Boolean)
                              .map((alias: string, i: number) => (
                                <Badge key={i} tone="info">
                                  {alias}
                                </Badge>
                              ))}
                          </InlineStack>
                        </div>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Badge tone={rule.actionType === ActionType.HIDE ? "critical" : "new"}>
                          {rule.actionType}
                        </Badge>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <InlineStack align="end">
                          <ButtonGroup noWrap>
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
                          </ButtonGroup>
                        </InlineStack>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              )}
            </Card>
          </Layout.Section>

          {/* Delivery Rules Overview */}
          <Layout.Section>
            <Card padding="0">
              <Box padding="400">
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
              </Box>
              <Divider />

              {deliveryRules.length === 0 ? (
                <Box padding="600">
                  <BlockStack align="center" inlineAlign="center" gap="200">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No delivery rules created yet. Create a rule to hide standard parcel shipping when freight products are in cart.
                    </Text>
                    <Button url="/app/delivery-rules?new=1">Create First Delivery Rule</Button>
                  </BlockStack>
                </Box>
              ) : (
                <IndexTable
                  resourceName={{ singular: "delivery rule", plural: "delivery rules" }}
                  itemCount={deliveryRules.length}
                  selectable={false}
                  headings={[
                    { title: "Rule Name" },
                    { title: "Status" },
                    { title: "Priority" },
                    { title: "Target Delivery Options" },
                    { title: "Action" },
                    { title: "Actions", alignment: "end" },
                  ]}
                >
                  {deliveryRules.map((rule, index) => (
                    <IndexTable.Row id={rule.id} key={rule.id} position={index}>
                      <IndexTable.Cell>
                        <Text variant="bodyMd" fontWeight="bold" as="span">
                          {rule.name}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Badge tone={rule.status === RuleStatus.ACTIVE ? "success" : "attention"}>
                          {rule.status}
                        </Badge>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Badge tone={getPriorityBadgeTone(rule.priority)}>
                          {getPriorityLabel(rule.priority)}
                        </Badge>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <div style={{ maxWidth: "320px" }}>
                          <InlineStack gap="100" wrap>
                            {rule.deliveryOptionName
                              .split(",")
                              .map((t: string) => t.trim())
                              .filter(Boolean)
                              .map((alias: string, i: number) => (
                                <Badge key={i} tone="info">
                                  {alias}
                                </Badge>
                              ))}
                          </InlineStack>
                        </div>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Badge tone={rule.actionType === ActionType.HIDE ? "critical" : "new"}>
                          {rule.actionType}
                        </Badge>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <InlineStack align="end">
                          <ButtonGroup noWrap>
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
                          </ButtonGroup>
                        </InlineStack>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              )}
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
                      Hide BNPL (Klarna/Affirm) or Cash on Delivery for buyers tagged with <code>b2b</code> or <code>wholesale</code>.
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
