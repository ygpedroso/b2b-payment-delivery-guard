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
  IndexTable,
  ButtonGroup,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { requireBilling } from "../billing.server";
import db from "../db.server";
import { syncDeliveryRules } from "../services/rules.server";
import {
  RuleStatus,
  PostalCodeType,
  ActionType,
  PRIORITY_OPTIONS,
  getPriorityLabel,
  getPriorityBadgeTone,
} from "../types/rules";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session, billing } = await authenticate.admin(request);
  await requireBilling(billing, admin);

  const shop = session.shop;
  const url = new URL(request.url);
  const editId = url.searchParams.get("edit");

  const rules = await db.deliveryRule.findMany({
    where: { shop },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
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
      await db.deliveryRule.deleteMany({
        where: { id, shop },
      });
      await syncDeliveryRules(admin, shop);
    }
    return redirect("/app/delivery-rules");
  }

  if (intent === "toggle_status") {
    const id = formData.get("id") as string;
    const current = await db.deliveryRule.findUnique({ where: { id } });
    if (current && current.shop === shop) {
      await db.deliveryRule.update({
        where: { id },
        data: { status: current.status === RuleStatus.ACTIVE ? RuleStatus.DRAFT : RuleStatus.ACTIVE },
      });
      await syncDeliveryRules(admin, shop);
    }
    return redirect("/app/delivery-rules");
  }

  // Create or Update
  const name = (formData.get("name") as string)?.trim();
  const targetDeliveryOption = (formData.get("deliveryOptionName") as string)?.trim();

  if (!name || !targetDeliveryOption) {
    return json(
      { error: "Rule Name and Target Delivery Option Name are required." },
      { status: 400 }
    );
  }

  const parseNumber = (val: FormDataEntryValue | null) => {
    if (!val || typeof val !== "string") return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  };

  const status = formData.get("status") === RuleStatus.ACTIVE ? RuleStatus.ACTIVE : RuleStatus.DRAFT;
  const priority = parseInt((formData.get("priority") as string) || "3", 10);
  const minTotalAmount = parseNumber(formData.get("minTotalAmount"));
  const maxTotalAmount = parseNumber(formData.get("maxTotalAmount"));
  const minTotalWeight = parseNumber(formData.get("minTotalWeight"));
  const maxTotalWeight = parseNumber(formData.get("maxTotalWeight"));
  const postalCodes = (formData.get("postalCodes") as string)?.trim() || null;
  const postalCodeType = (formData.get("postalCodeType") as PostalCodeType) || PostalCodeType.PREFIX;
  const countryCodes = (formData.get("countryCodes") as string)?.trim() || null;
  const provinceCodes = (formData.get("provinceCodes") as string)?.trim() || null;
  const productTags = (formData.get("productTags") as string)?.trim() || null;
  const actionType = (formData.get("actionType") as ActionType) || ActionType.HIDE;

  const ruleData = {
    name,
    status,
    priority,
    minTotalAmount,
    maxTotalAmount,
    minTotalWeight,
    maxTotalWeight,
    postalCodes,
    postalCodeType,
    countryCodes,
    provinceCodes,
    productTags,
    deliveryOptionName: targetDeliveryOption,
    actionType,
  };

  if (intent === "update") {
    const id = formData.get("id") as string;
    await db.deliveryRule.updateMany({
      where: { id, shop },
      data: ruleData,
    });
  } else {
    // create
    await db.deliveryRule.create({
      data: {
        ...ruleData,
        shop,
      },
    });
  }

  await syncDeliveryRules(admin, shop);
  return redirect("/app/delivery-rules");
};

interface DeliveryRuleFormProps {
  ruleToEdit: any;
  isSubmitting: boolean;
  onSubmit: (formData: FormData) => void;
}

function DeliveryRuleForm({ ruleToEdit, isSubmitting, onSubmit }: DeliveryRuleFormProps) {
  const [name, setName] = useState(ruleToEdit?.name ?? "");
  const [isActive, setIsActive] = useState(ruleToEdit ? ruleToEdit.status === RuleStatus.ACTIVE : true);
  const [priority, setPriority] = useState<string>(ruleToEdit?.priority?.toString() ?? "3");
  const [minTotalAmount, setMinTotalAmount] = useState(ruleToEdit?.minTotalAmount?.toString() ?? "");
  const [maxTotalAmount, setMaxTotalAmount] = useState(ruleToEdit?.maxTotalAmount?.toString() ?? "");
  const [minTotalWeight, setMinTotalWeight] = useState(ruleToEdit?.minTotalWeight?.toString() ?? "");
  const [maxTotalWeight, setMaxTotalWeight] = useState(ruleToEdit?.maxTotalWeight?.toString() ?? "");
  const [postalCodes, setPostalCodes] = useState(ruleToEdit?.postalCodes ?? "");
  const [postalCodeType, setPostalCodeType] = useState<string>(ruleToEdit?.postalCodeType ?? PostalCodeType.PREFIX);
  const [countryCodes, setCountryCodes] = useState(ruleToEdit?.countryCodes ?? "");
  const [provinceCodes, setProvinceCodes] = useState(ruleToEdit?.provinceCodes ?? "");
  const [productTags, setProductTags] = useState(ruleToEdit?.productTags ?? "");
  const [deliveryOptionName, setDeliveryOptionName] = useState(ruleToEdit?.deliveryOptionName ?? "");
  const [actionType, setActionType] = useState<string>(ruleToEdit?.actionType ?? ActionType.HIDE);

  useEffect(() => {
    setName(ruleToEdit?.name ?? "");
    setIsActive(ruleToEdit ? ruleToEdit.status === RuleStatus.ACTIVE : true);
    setPriority(ruleToEdit?.priority?.toString() ?? "3");
    setMinTotalAmount(ruleToEdit?.minTotalAmount?.toString() ?? "");
    setMaxTotalAmount(ruleToEdit?.maxTotalAmount?.toString() ?? "");
    setMinTotalWeight(ruleToEdit?.minTotalWeight?.toString() ?? "");
    setMaxTotalWeight(ruleToEdit?.maxTotalWeight?.toString() ?? "");
    setPostalCodes(ruleToEdit?.postalCodes ?? "");
    setPostalCodeType(ruleToEdit?.postalCodeType ?? PostalCodeType.PREFIX);
    setCountryCodes(ruleToEdit?.countryCodes ?? "");
    setProvinceCodes(ruleToEdit?.provinceCodes ?? "");
    setProductTags(ruleToEdit?.productTags ?? "");
    setDeliveryOptionName(ruleToEdit?.deliveryOptionName ?? "");
    setActionType(ruleToEdit?.actionType ?? ActionType.HIDE);
  }, [ruleToEdit]);

  return (
    <Layout>
      <Layout.Section>
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              {ruleToEdit ? `Edit Rule: ${ruleToEdit.name}` : "Create New Delivery Rule"}
            </Text>
            <Divider />

            <TextField
              label="Rule Name"
              value={name}
              onChange={setName}
              placeholder="e.g. Hide Express for Freight Items"
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
                  label="Product Tags"
                  value={productTags}
                  onChange={setProductTags}
                  placeholder="e.g. freight, heavy, oversized, ltl"
                  autoComplete="off"
                  helpText="Applies if cart contains any item with one of these product tags."
                />
              </div>
            </InlineStack>

            <InlineStack gap="400">
              <div style={{ flex: 2 }}>
                <TextField
                  label="Postal Code / Zip Filter"
                  value={postalCodes}
                  onChange={setPostalCodes}
                  placeholder="e.g. 902, 903 or ^P\\.?O\\.?\\s?BOX"
                  autoComplete="off"
                  helpText="Filter shipping addresses by postal code prefix, regex pattern, or list."
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  label="Postal Code Match Type"
                  options={[
                    { label: "Prefix Match", value: PostalCodeType.PREFIX },
                    { label: "Regex Pattern", value: PostalCodeType.REGEX },
                    { label: "Exact List", value: PostalCodeType.LIST },
                  ]}
                  value={postalCodeType}
                  onChange={setPostalCodeType}
                />
              </div>
            </InlineStack>

            <InlineStack gap="400">
              <div style={{ flex: 1 }}>
                <TextField
                  label="Minimum Total Weight"
                  type="number"
                  value={minTotalWeight}
                  onChange={setMinTotalWeight}
                  placeholder="e.g. 50.0"
                  autoComplete="off"
                  helpText="Applies if total cart weight is greater than or equal to this."
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Maximum Total Weight"
                  type="number"
                  value={maxTotalWeight}
                  onChange={setMaxTotalWeight}
                  placeholder="e.g. 500.0"
                  autoComplete="off"
                  helpText="Applies if total cart weight is less than or equal to this."
                />
              </div>
            </InlineStack>

            <InlineStack gap="400">
              <div style={{ flex: 1 }}>
                <TextField
                  label="Minimum Total Order Amount ($)"
                  type="number"
                  value={minTotalAmount}
                  onChange={setMinTotalAmount}
                  placeholder="e.g. 500.00"
                  autoComplete="off"
                  helpText="Applies if cart total is greater than or equal to this amount."
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Maximum Total Order Amount ($)"
                  type="number"
                  value={maxTotalAmount}
                  onChange={setMaxTotalAmount}
                  placeholder="e.g. 10000.00"
                  autoComplete="off"
                  helpText="Applies if cart total is less than or equal to this amount."
                />
              </div>
            </InlineStack>

            <InlineStack gap="400">
              <div style={{ flex: 1 }}>
                <TextField
                  label="Country Codes"
                  value={countryCodes}
                  onChange={setCountryCodes}
                  placeholder="e.g. US, CA"
                  autoComplete="off"
                  helpText="Comma-separated ISO country codes."
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Province / State Codes"
                  value={provinceCodes}
                  onChange={setProvinceCodes}
                  placeholder="e.g. CA, NY, TX"
                  autoComplete="off"
                  helpText="Comma-separated province or state codes."
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
                  label="Target Delivery Option Name Match"
                  value={deliveryOptionName}
                  onChange={setDeliveryOptionName}
                  placeholder="e.g. Express, Standard, Freight"
                  autoComplete="off"
                  helpText="Case-insensitive substring match against delivery rate titles or handles. Supports comma-separated aliases (e.g. Express, Standard Ground)."
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  label="Action"
                  options={[
                    { label: "Hide Option", value: ActionType.HIDE },
                    { label: "Move to Top (Prioritize)", value: ActionType.MOVE_TO_TOP },
                    { label: "Move to Bottom", value: ActionType.MOVE_TO_BOTTOM },
                  ]}
                  value={actionType}
                  onChange={setActionType}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  label="Priority"
                  options={PRIORITY_OPTIONS}
                  value={priority}
                  onChange={setPriority}
                  helpText="Higher priority rules evaluate first. Hide actions always override move actions."
                />
              </div>
            </InlineStack>

            <Divider />
            <InlineStack align="end" gap="300">
              <Button url="/app/delivery-rules">Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  const form = new FormData();
                  form.append("intent", ruleToEdit ? "update" : "create");
                  if (ruleToEdit) form.append("id", ruleToEdit.id);
                  form.append("name", name);
                  form.append("status", isActive ? RuleStatus.ACTIVE : RuleStatus.DRAFT);
                  form.append("priority", priority);
                  form.append("minTotalAmount", minTotalAmount);
                  form.append("maxTotalAmount", maxTotalAmount);
                  form.append("minTotalWeight", minTotalWeight);
                  form.append("maxTotalWeight", maxTotalWeight);
                  form.append("postalCodes", postalCodes);
                  form.append("postalCodeType", postalCodeType);
                  form.append("countryCodes", countryCodes);
                  form.append("provinceCodes", provinceCodes);
                  form.append("productTags", productTags);
                  form.append("deliveryOptionName", deliveryOptionName);
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

export default function DeliveryRules() {
  const { rules, ruleToEdit, isCreating } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ error?: string }>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const showForm = isCreating || !!ruleToEdit;

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this delivery rule?")) {
      submit({ intent: "delete", id }, { method: "post" });
    }
  };

  const handleToggle = (id: string) => {
    submit({ intent: "toggle_status", id }, { method: "post" });
  };


  return (
    <Page
      title="Delivery & Shipping Rules"
      subtitle="Conditionally hide, prioritize, or reorder delivery options at checkout"
      fullWidth
      primaryAction={
        !showForm
          ? {
              content: "Create Delivery Rule",
              url: "/app/delivery-rules?new=1",
            }
          : undefined
      }
      backAction={showForm ? { content: "Rules List", url: "/app/delivery-rules" } : undefined}
    >
      <BlockStack gap="500">
        {actionData?.error && (
          <Banner title="Error" tone="critical">
            <p>{actionData.error}</p>
          </Banner>
        )}

        {showForm ? (
          <DeliveryRuleForm
            key={ruleToEdit ? ruleToEdit.id : "new-delivery-rule"}
            ruleToEdit={ruleToEdit}
            isSubmitting={isSubmitting}
            onSubmit={(form) => submit(form, { method: "post" })}
          />
        ) : (
          <Layout>
            <Layout.Section>
              <Card padding="0">
                <Box padding="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">
                      Active & Draft Rules ({rules.length})
                    </Text>
                    <Button variant="primary" url="/app/delivery-rules?new=1">
                      Create Rule
                    </Button>
                  </InlineStack>
                </Box>
                <Divider />

                {rules.length === 0 ? (
                  <Box padding="600">
                    <BlockStack align="center" inlineAlign="center" gap="200">
                      <Text as="p" tone="subdued">
                        No delivery rules created yet.
                      </Text>
                      <Button url="/app/delivery-rules?new=1">Create Your First Rule</Button>
                    </BlockStack>
                  </Box>
                ) : (
                  <IndexTable
                    resourceName={{ singular: "delivery rule", plural: "delivery rules" }}
                    itemCount={rules.length}
                    selectable={false}
                    headings={[
                      { title: "Rule Name" },
                      { title: "Status" },
                      { title: "Priority" },
                      { title: "Target Options" },
                      { title: "Conditions" },
                      { title: "Action" },
                      { title: "Actions", alignment: "end" },
                    ]}
                  >
                    {rules.map((rule, index) => (
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
                          <div style={{ maxWidth: "220px" }}>
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
                          <div style={{ maxWidth: "220px" }}>
                            <InlineStack gap="100" wrap>
                              {rule.productTags && (
                                <Badge size="small">Product Tags: [{rule.productTags}]</Badge>
                              )}
                              {rule.postalCodes && (
                                <Badge size="small">
                                  Zip ({rule.postalCodeType}): {rule.postalCodes}
                                </Badge>
                              )}
                              {rule.minTotalWeight && (
                                <Badge size="small">Weight ≥ {rule.minTotalWeight} lbs</Badge>
                              )}
                              {rule.countryCodes && (
                                <Badge size="small">Country: {rule.countryCodes}</Badge>
                              )}
                              {!rule.productTags &&
                                !rule.postalCodes &&
                                !rule.minTotalWeight &&
                                !rule.countryCodes && (
                                  <Text as="span" tone="subdued">
                                    Always applies
                                  </Text>
                                )}
                            </InlineStack>
                          </div>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <Badge
                            tone={
                              rule.actionType === ActionType.HIDE
                                ? "critical"
                                : rule.actionType === ActionType.MOVE_TO_TOP
                                ? "success"
                                : "new"
                            }
                          >
                            {rule.actionType}
                          </Badge>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <InlineStack align="end">
                            <ButtonGroup noWrap>
                              <Button
                                size="slim"
                                onClick={() => handleToggle(rule.id)}
                                disabled={isSubmitting}
                              >
                                {rule.status === RuleStatus.ACTIVE ? "Disable" : "Enable"}
                              </Button>
                              <Button size="slim" url={`/app/delivery-rules?edit=${rule.id}`}>
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
                            </ButtonGroup>
                          </InlineStack>
                        </IndexTable.Cell>
                      </IndexTable.Row>
                    ))}
                  </IndexTable>
                )}
              </Card>
            </Layout.Section>
          </Layout>
        )}
      </BlockStack>
    </Page>
  );
}
