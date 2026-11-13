// @ts-check

export enum RuleStatus {
  ACTIVE = "ACTIVE",
  DRAFT = "DRAFT",
}

export enum ActionType {
  HIDE = "HIDE",
  MOVE_TO_BOTTOM = "MOVE_TO_BOTTOM",
}

export interface PaymentRuleConfig {
  id: string;
  name: string;
  status: RuleStatus | string;
  priority?: number;
  minSubtotal?: number | null;
  maxSubtotal?: number | null;
  customerTags?: string[];
  customerTagsMatch?: "ANY" | "ALL";
  countryCodes?: string[];
  currencies?: string[];
  productTags?: string[];
  productIds?: string[];
  paymentMethodName: string;
  actionType: ActionType | string;
}

export interface Configuration {
  rules?: PaymentRuleConfig[];
}

export interface RunInput {
  cart: {
    cost: {
      subtotalAmount: {
        amount: string;
        currencyCode: string;
      };
      totalAmount: {
        amount: string;
        currencyCode: string;
      };
    };
    buyerIdentity?: {
      customer?: {
        id: string;
        hasTags?: Array<{
          hasTag: boolean;
          tag: string;
        }>;
      } | null;
    } | null;
    lines: Array<{
      id: string;
      quantity: number;
      merchandise?: {
        __typename?: string;
        id?: string;
        product?: {
          id?: string;
          hasTags?: Array<{
            hasTag: boolean;
            tag: string;
          }>;
        };
      };
    }>;
    deliveryGroups?: Array<{
      deliveryAddress?: {
        countryCode?: string;
        provinceCode?: string;
      } | null;
    }>;
  };
  paymentMethods: Array<{
    id: string;
    name: string;
  }>;
  paymentCustomization?: {
    metafield?: {
      jsonValue?: any;
    } | null;
  } | null;
}

export interface Operation {
  hide?: {
    paymentMethodId: string;
  };
  move?: {
    paymentMethodId: string;
    index: number;
  };
}

export interface FunctionRunResult {
  operations: Operation[];
}

const NO_CHANGES: FunctionRunResult = { operations: [] };

export function run(input: RunInput): FunctionRunResult {
  const config: Configuration = input?.paymentCustomization?.metafield?.jsonValue ?? {};
  const rules = config.rules;

  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    return NO_CHANGES;
  }

  const subtotal = parseFloat(input?.cart?.cost?.subtotalAmount?.amount ?? "0.0");
  const currency = input?.cart?.cost?.subtotalAmount?.currencyCode ?? input?.cart?.cost?.totalAmount?.currencyCode ?? "";

  // Extract customer tags that are true
  const customerTagsList = (input?.cart?.buyerIdentity?.customer?.hasTags ?? [])
    .filter((t) => t.hasTag)
    .map((t) => t.tag.toLowerCase());

  // Extract shipping country code
  const shippingCountry = input?.cart?.deliveryGroups?.[0]?.deliveryAddress?.countryCode?.toUpperCase() ?? "";

  // Extract product tags and product IDs present in cart lines
  const cartProductTags = new Set<string>();
  const cartProductIds = new Set<string>();

  for (const line of input?.cart?.lines ?? []) {
    const product = line.merchandise?.product;
    if (product?.id) {
      cartProductIds.add(product.id);
    }
    for (const tagInfo of product?.hasTags ?? []) {
      if (tagInfo.hasTag) {
        cartProductTags.add(tagInfo.tag.toLowerCase());
      }
    }
  }

  // Sort rules by priority ASC (1=Highest, 5=Lowest)
  const sortedRules = [...rules].sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3));

  console.error(
    `[B2B Payment Guard] Executing function: subtotal=${subtotal}, customerTags=${JSON.stringify(customerTagsList)}, methods=${JSON.stringify(
      (input.paymentMethods || []).map((m) => m.name)
    )}`
  );

  // Target Decision Map: methodId -> { action: ActionType, priority: number }
  // Precedence rule: HIDE always dominates MOVE regardless of priority.
  // Between multiple MOVE actions, the highest priority rule (lowest numeric priority) wins.
  const targetDecisions = new Map<string, { action: ActionType; priority: number }>();

  for (const rule of sortedRules) {
    if (rule.status !== RuleStatus.ACTIVE) {
      continue;
    }

    // Condition 1: Minimum Subtotal
    if (typeof rule.minSubtotal === "number" && !isNaN(rule.minSubtotal)) {
      if (subtotal < rule.minSubtotal) {
        continue;
      }
    }

    // Condition 2: Maximum Subtotal
    if (typeof rule.maxSubtotal === "number" && !isNaN(rule.maxSubtotal)) {
      if (subtotal > rule.maxSubtotal) {
        continue;
      }
    }

    // Condition 3: Customer Tags
    if (rule.customerTags && rule.customerTags.length > 0) {
      const matchType = rule.customerTagsMatch || "ANY";
      const normalizedRuleTags = rule.customerTags.map((t) => t.trim().toLowerCase()).filter(Boolean);

      if (matchType === "ALL") {
        const hasAllTags = normalizedRuleTags.every((t) => customerTagsList.includes(t));
        if (!hasAllTags) {
          console.error(`[B2B Payment Guard] Rule '${rule.name}' skipped: customer missing required tags. Required: [${normalizedRuleTags.join(", ")}], Actual: [${customerTagsList.join(", ")}]`);
          continue;
        }
      } else {
        const hasAnyTag = normalizedRuleTags.some((t) => customerTagsList.includes(t));
        if (!hasAnyTag) {
          console.error(`[B2B Payment Guard] Rule '${rule.name}' skipped: customer has none of [${normalizedRuleTags.join(", ")}]. Actual: [${customerTagsList.join(", ")}]`);
          continue;
        }
      }
    }

    // Condition 4: Country Codes
    if (rule.countryCodes && rule.countryCodes.length > 0) {
      const normalizedCountries = rule.countryCodes.map((c) => c.trim().toUpperCase()).filter(Boolean);
      if (!shippingCountry || !normalizedCountries.includes(shippingCountry)) {
        continue;
      }
    }

    // Condition 5: Currencies
    if (rule.currencies && rule.currencies.length > 0) {
      const normalizedCurrencies = rule.currencies.map((c) => c.trim().toUpperCase()).filter(Boolean);
      if (!currency || !normalizedCurrencies.includes(currency)) {
        continue;
      }
    }

    // Condition 6: Product Tags
    if (rule.productTags && rule.productTags.length > 0) {
      const normalizedProductTags = rule.productTags.map((t) => t.trim().toLowerCase()).filter(Boolean);
      const hasMatchingProductTag = normalizedProductTags.some((t) => cartProductTags.has(t));
      if (!hasMatchingProductTag) {
        continue;
      }
    }

    // Condition 7: Product IDs
    if (rule.productIds && rule.productIds.length > 0) {
      const hasMatchingProductId = rule.productIds.some((id) => cartProductIds.has(id.trim()));
      if (!hasMatchingProductId) {
        continue;
      }
    }

    // All conditions met! Find target payment method(s)
    const rawTarget = rule.paymentMethodName || "";
    const targets = rawTarget
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const matchingMethods = (input.paymentMethods || []).filter((method) => {
      const methodName = (method.name || "").toLowerCase();
      if (!methodName) return false;
      return targets.some((target) => methodName.includes(target));
    });

    const rulePriority = rule.priority ?? 3;
    const ruleAction = (rule.actionType as ActionType) || ActionType.HIDE;
    const isHide = ruleAction === ActionType.HIDE;

    for (const method of matchingMethods) {
      const existing = targetDecisions.get(method.id);

      if (!existing) {
        targetDecisions.set(method.id, {
          action: isHide ? ActionType.HIDE : ActionType.MOVE_TO_BOTTOM,
          priority: rulePriority,
        });
      } else {
        // HIDE always takes precedence over MOVE
        if (isHide) {
          targetDecisions.set(method.id, {
            action: ActionType.HIDE,
            priority: Math.min(existing.priority, rulePriority),
          });
        } else if (existing.action !== ActionType.HIDE) {
          // Both are MOVE, higher priority (lower numeric value) wins
          if (rulePriority < existing.priority) {
            targetDecisions.set(method.id, {
              action: ActionType.MOVE_TO_BOTTOM,
              priority: rulePriority,
            });
          }
        }
      }
    }
  }

  const operations: Operation[] = [];
  for (const [methodId, decision] of targetDecisions.entries()) {
    if (decision.action === ActionType.MOVE_TO_BOTTOM) {
      operations.push({
        move: {
          paymentMethodId: methodId,
          index: 999,
        },
      });
    } else {
      operations.push({
        hide: {
          paymentMethodId: methodId,
        },
      });
    }
  }

  console.error(`[B2B Payment Guard] Finished execution. Returning ${operations.length} operations: ${JSON.stringify(operations)}`);

  return { operations };
}
