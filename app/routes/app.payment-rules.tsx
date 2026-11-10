import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useSubmit,
  useNavigation,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  TextField,
  Button,
  Banner,
  BlockStack,
  Text,
  Badge,
  InlineStack,
  Select,
  Checkbox,
  Divider,
  DataTable,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { requireBilling } from "../billing.server";
import db from "../db.server";
import { syncPaymentRules } from "../services/rules.server";
import { RuleStatus, ActionType } from "../types/rules";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session, billing } = await authenticate.admin(request);
  await requireBilling(billing, admin);

  const shop = session.shop;
  const url = new URL(request.url);
  const editId = url.searchParams.get("edit");

  const rules = await db.paymentRule.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });

  const ruleToEdit = editId
    ? rules.find((r) => r.id === editId) ?? null
    : null;

  return json({
    rules,
    ruleToEdit,
    isCreating: url.searchParams.get("new") === "1",
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session, billing } = await authenticate.admin(request);
  await requireBilling(billing, admin);

  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const id = formData.get("id") as string;
    if (id) {
      await db.paymentRule.deleteMany({
        where: { id, shop },
      });
      await syncPaymentRules(admin, shop);
    }
    return redirect("/app/payment-rules");
  }

  if (intent === "toggle_status") {
    const id = formData.get("id") as string;
    const current = await db.paymentRule.findUnique({ where: { id } });
    if (current && current.shop === shop) {
      await db.paymentRule.update({
        where: { id },
        data: { status: current.status === RuleStatus.ACTIVE ? RuleStatus.DRAFT : RuleStatus.ACTIVE },
      });
      await syncPaymentRules(admin, shop);
    }
    return redirect("/app/payment-rules");
  }

  // Create or Update
  const name = (formData.get("name") as string)?.trim();
  const targetPaymentMethod = (formData.get("paymentMethodName") as string)?.trim();

  if (!name || !targetPaymentMethod) {
    return json(
      { error: "Rule Name and Target Payment Method Name are required." },
      { status: 400 }
    );
  }

  const parseNumber = (val: FormDataEntryValue | null) => {
    if (!val || typeof val !== "string") return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  };

  const status = formData.get("status") === RuleStatus.ACTIVE ? RuleStatus.ACTIVE : RuleStatus.DRAFT;
  const minSubtotal = parseNumber(formData.get("minSubtotal"));
  const maxSubtotal = parseNumber(formData.get("maxSubtotal"));
  const customerTags = (formData.get("customerTags") as string)?.trim() || null;
  const customerTagsMatch = (formData.get("customerTagsMatch") as string) || "ANY";
  const countryCodes = (formData.get("countryCodes") as string)?.trim() || null;
  const currencies = (formData.get("currencies") as string)?.trim() || null;
  const productTags = (formData.get("productTags") as string)?.trim() || null;
  const productIds = (formData.get("productIds") as string)?.trim() || null;
  const actionType = (formData.get("actionType") as ActionType) || ActionType.HIDE;

  const ruleData = {
    name,
    status,
    minSubtotal,
    maxSubtotal,
    customerTags,
    customerTagsMatch,
    countryCodes,
    currencies,
    productTags,
    productIds,
    paymentMethodName: targetPaymentMethod,
    actionType,
  };

  if (intent === "update") {
    const id = formData.get("id") as string;
    await db.paymentRule.updateMany({
      where: { id, shop },
      data: ruleData,
    });
  } else {
    // create
    await db.paymentRule.create({
      data: {
        ...ruleData,
        shop,
      },
    });
  }

  await syncPaymentRules(admin, shop);
  return redirect("/app/payment-rules");
};

interface PaymentRuleFormProps {
  ruleToEdit: any;
  isSubmitting: boolean;
  onSubmit: (formData: FormData) => void;
}

function PaymentRuleForm({ ruleToEdit, isSubmitting, onSubmit }: PaymentRuleFormProps) {
  const [name, setName] = useState(ruleToEdit?.name ?? "");
  const [isActive, setIsActive] = useState(ruleToEdit ? ruleToEdit.status === RuleStatus.ACTIVE : true);
  const [minSubtotal, setMinSubtotal] = useState(ruleToEdit?.minSubtotal?.toString() ?? "");
  const [maxSubtotal, setMaxSubtotal] = useState(ruleToEdit?.maxSubtotal?.toString() ?? "");
  const [customerTags, setCustomerTags] = useState(ruleToEdit?.customerTags ?? "");
  const [customerTagsMatch, setCustomerTagsMatch] = useState(ruleToEdit?.customerTagsMatch ?? "ANY");
  const [countryCodes, setCountryCodes] = useState(ruleToEdit?.countryCodes ?? "");
  const [currencies, setCurrencies] = useState(ruleToEdit?.currencies ?? "");
  const [productTags, setProductTags] = useState(ruleToEdit?.productTags ?? "");
  const [productIds, setProductIds] = useState(ruleToEdit?.productIds ?? "");
  const [paymentMethodName, setPaymentMethodName] = useState(ruleToEdit?.paymentMethodName ?? "");
  const [actionType, setActionType] = useState<string>(ruleToEdit?.actionType ?? ActionType.HIDE);

  useEffect(() => {
    setName(ruleToEdit?.name ?? "");
    setIsActive(ruleToEdit ? ruleToEdit.status === RuleStatus.ACTIVE : true);
    setMinSubtotal(ruleToEdit?.minSubtotal?.toString() ?? "");
    setMaxSubtotal(ruleToEdit?.maxSubtotal?.toString() ?? "");
    setCustomerTags(ruleToEdit?.customerTags ?? "");
    setCustomerTagsMatch(ruleToEdit?.customerTagsMatch ?? "ANY");
    setCountryCodes(ruleToEdit?.countryCodes ?? "");
    setCurrencies(ruleToEdit?.currencies ?? "");
    setProductTags(ruleToEdit?.productTags ?? "");
    setProductIds(ruleToEdit?.productIds ?? "");
    setPaymentMethodName(ruleToEdit?.paymentMethodName ?? "");
    setActionType(ruleToEdit?.actionType ?? ActionType.HIDE);
  }, [ruleToEdit]);

  return (
    <Layout>
      <Layout.Section>
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              {ruleToEdit ? `Edit Rule: ${ruleToEdit.name}` : "Create New Payment Rule"}
            </Text>
            <Divider />

            <TextField
              label="Rule Name"
              value={name}
              onChange={setName}
              placeholder="e.g. Hide COD over $200"
              autoComplete="off"
              helpText="Internal description of this rule."
            />

            <Checkbox
              label="Rule Active"
              checked={isActive}
              onChange={setIsActive}
              helpText="When disabled, this rule is saved as Draft and will not execute at checkout."
            />

            <Divider />
            <Text as="h3" variant="headingSm">
              Conditions (All specified conditions must be satisfied)
            </Text>

            <InlineStack gap="400">
              <div style={{ flex: 1 }}>
                <TextField
                  label="Minimum Subtotal ($)"
                  type="number"
                  value={minSubtotal}
                  onChange={setMinSubtotal}
                  placeholder="e.g. 200.00"
                  autoComplete="off"
                  helpText="Applies if cart subtotal is greater than or equal to this amount."
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Maximum Subtotal ($)"
                  type="number"
                  value={maxSubtotal}
                  onChange={setMaxSubtotal}
                  placeholder="e.g. 5000.00"
                  autoComplete="off"
                  helpText="Applies if cart subtotal is less than or equal to this amount."
                />
              </div>
            </InlineStack>

            <InlineStack gap="400">
              <div style={{ flex: 2 }}>
                <TextField
                  label="Customer Tags"
                  value={customerTags}
                  onChange={setCustomerTags}
                  placeholder="e.g. wholesale, b2b, net-terms"
                  autoComplete="off"
                  helpText="Comma-separated list of customer tags."
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  label="Tag Match Mode"
                  options={[
                    { label: "Matches ANY tag", value: "ANY" },
                    { label: "Matches ALL tags", value: "ALL" },
                  ]}
                  value={customerTagsMatch}
                  onChange={setCustomerTagsMatch}
                />
              </div>
            </InlineStack>

            <InlineStack gap="400">
              <div style={{ flex: 1 }}>
                <TextField
                  label="Country Codes"
                  value={countryCodes}
                  onChange={setCountryCodes}
                  placeholder="e.g. US, CA, GB"
                  autoComplete="off"
                  helpText="Comma-separated ISO 2-letter shipping country codes."
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Currencies"
                  value={currencies}
                  onChange={setCurrencies}
                  placeholder="e.g. USD, EUR, CAD"
                  autoComplete="off"
                  helpText="Comma-separated currency codes."
                />
              </div>
            </InlineStack>

            <InlineStack gap="400">
              <div style={{ flex: 1 }}>
                <TextField
                  label="Product Tags"
                  value={productTags}
                  onChange={setProductTags}
                  placeholder="e.g. restricted, b2b-only"
                  autoComplete="off"
                  helpText="Applies if any cart line item contains one of these product tags."
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Product IDs"
                  value={productIds}
                  onChange={setProductIds}
                  placeholder="e.g. gid://shopify/Product/12345"
                  autoComplete="off"
                  helpText="Comma-separated product IDs."
                />
              </div>
            </InlineStack>

            <Divider />
            <Text as="h3" variant="headingSm">
              Target & Action
            </Text>

            <InlineStack gap="400">
              <div style={{ flex: 2 }}>
                <TextField
                  label="Target Payment Method Name"
                  value={paymentMethodName}
                  onChange={setPaymentMethodName}
                  placeholder="e.g. Cash on Delivery, Klarna, Credit Card"
                  autoComplete="off"
                  helpText="Case-insensitive match against checkout payment method names."
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  label="Action"
                  options={[
                    { label: "Hide Method", value: ActionType.HIDE },
                    { label: "Move to Bottom", value: ActionType.MOVE_TO_BOTTOM },
                  ]}
                  value={actionType}
                  onChange={setActionType}
                />
              </div>
            </InlineStack>

            <Divider />
            <InlineStack align="end" gap="300">
              <Button url="/app/payment-rules">Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  const form = new FormData();
                  form.append("intent", ruleToEdit ? "update" : "create");
                  if (ruleToEdit) form.append("id", ruleToEdit.id);
                  form.append("name", name);
                  form.append("status", isActive ? RuleStatus.ACTIVE : RuleStatus.DRAFT);
                  form.append("minSubtotal", minSubtotal);
                  form.append("maxSubtotal", maxSubtotal);
                  form.append("customerTags", customerTags);
                  form.append("customerTagsMatch", customerTagsMatch);
                  form.append("countryCodes", countryCodes);
                  form.append("currencies", currencies);
                  form.append("productTags", productTags);
                  form.append("productIds", productIds);
                  form.append("paymentMethodName", paymentMethodName);
                  form.append("actionType", actionType);
                  onSubmit(form);
                }}
                loading={isSubmitting}
              >
                {ruleToEdit ? "Save Changes" : "Create Rule"}
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      </Layout.Section>
    </Layout>
  );
}

export default function PaymentRules() {
  const { rules, ruleToEdit, isCreating } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ error?: string }>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const showForm = isCreating || !!ruleToEdit;

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this payment rule?")) {
      submit({ intent: "delete", id }, { method: "post" });
    }
  };

  const handleToggle = (id: string) => {
    submit({ intent: "toggle_status", id }, { method: "post" });
  };

  const rows = rules.map((rule) => [
    <Text key={rule.id} variant="bodyMd" fontWeight="bold" as="span">
      {rule.name}
    </Text>,
    <Badge
      key={`${rule.id}-status`}
      tone={rule.status === RuleStatus.ACTIVE ? "success" : "attention"}
    >
      {rule.status}
    </Badge>,
    <span key={`${rule.id}-conditions`}>
      {rule.minSubtotal ? `Subtotal ≥ $${rule.minSubtotal} ` : ""}
      {rule.customerTags ? `Tags: [${rule.customerTags}] ` : ""}
      {rule.countryCodes ? `Country: ${rule.countryCodes} ` : ""}
      {!rule.minSubtotal && !rule.customerTags && !rule.countryCodes ? "Always" : ""}
    </span>,
    <span key={`${rule.id}-target`}>{rule.paymentMethodName}</span>,
    <Badge key={`${rule.id}-action`}>{rule.actionType}</Badge>,
    <InlineStack key={`${rule.id}-ops`} gap="200">
      <Button
        size="slim"
        onClick={() => handleToggle(rule.id)}
        disabled={isSubmitting}
      >
        {rule.status === RuleStatus.ACTIVE ? "Disable" : "Enable"}
      </Button>
      <Button size="slim" url={`/app/payment-rules?edit=${rule.id}`}>
        Edit
      </Button>
      <Button
        size="slim"
        tone="critical"
        onClick={() => handleDelete(rule.id)}
        disabled={isSubmitting}
      >
        Delete
      </Button>
    </InlineStack>,
  ]);

  return (
    <Page
      title="Payment Customization Rules"
      subtitle="Conditionally hide, restrict, or reorder payment methods at checkout"
      primaryAction={
        !showForm
          ? {
              content: "Create Payment Rule",
              url: "/app/payment-rules?new=1",
            }
          : undefined
      }
      backAction={showForm ? { content: "Rules List", url: "/app/payment-rules" } : undefined}
    >
      <BlockStack gap="500">
        {actionData?.error && (
          <Banner title="Error" tone="critical">
            <p>{actionData.error}</p>
          </Banner>
        )}

        {showForm ? (
          <PaymentRuleForm
            key={ruleToEdit ? ruleToEdit.id : "new-payment-rule"}
            ruleToEdit={ruleToEdit}
            isSubmitting={isSubmitting}
            onSubmit={(form) => submit(form, { method: "post" })}
          />
        ) : (
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">
                      Active & Draft Rules ({rules.length})
                    </Text>
                    <Button variant="primary" url="/app/payment-rules?new=1">
                      Create Rule
                    </Button>
                  </InlineStack>

                  {rules.length === 0 ? (
                    <Box padding="400">
                      <BlockStack align="center" inlineAlign="center" gap="200">
                        <Text as="p" tone="subdued">
                          No payment rules created yet.
                        </Text>
                        <Button url="/app/payment-rules?new=1">Create Your First Rule</Button>
                      </BlockStack>
                    </Box>
                  ) : (
                    <DataTable
                      columnContentTypes={["text", "text", "text", "text", "text", "text"]}
                      headings={["Name", "Status", "Conditions", "Target Method", "Action", "Actions"]}
                      rows={rows}
                    />
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )}
      </BlockStack>
    </Page>
  );
}
