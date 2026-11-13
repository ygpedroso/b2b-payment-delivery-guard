// @ts-check

export enum RuleStatus {
  ACTIVE = "ACTIVE",
  DRAFT = "DRAFT",
}

export enum PostalCodeType {
  PREFIX = "PREFIX",
  REGEX = "REGEX",
  LIST = "LIST",
}

export enum ActionType {
  HIDE = "HIDE",
  MOVE_TO_BOTTOM = "MOVE_TO_BOTTOM",
  MOVE_TO_TOP = "MOVE_TO_TOP",
}

export interface DeliveryRuleConfig {
  id: string;
  name: string;
  status: RuleStatus | string;
  priority?: number;
  minTotalAmount?: number | null;
  maxTotalAmount?: number | null;
  minTotalWeight?: number | null;
  maxTotalWeight?: number | null;
  postalCodes?: string[];
  postalCodeType?: PostalCodeType | string;
  countryCodes?: string[];
  provinceCodes?: string[];
  productTags?: string[];
  deliveryOptionName: string;
  actionType: ActionType | string;
}

export interface Configuration {
  rules?: DeliveryRuleConfig[];
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
    lines: Array<{
      id: string;
      quantity: number;
      merchandise?: {
        __typename?: string;
        id?: string;
        weight?: number | null;
        weightUnit?: string | null;
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
        address1?: string | null;
        address2?: string | null;
        countryCode?: string | null;
        provinceCode?: string | null;
        zip?: string | null;
      } | null;
      deliveryOptions: Array<{
        handle: string;
        title?: string | null;
        cost?: {
          amount: string;
          currencyCode: string;
        } | null;
      }>;
    }>;
  };
  deliveryCustomization?: {
    metafield?: {
      jsonValue?: any;
    } | null;
  } | null;
}

export interface Operation {
  hide?: {
    deliveryOptionHandle: string;
  };
  move?: {
    deliveryOptionHandle: string;
    index: number;
  };
  rename?: {
    deliveryOptionHandle: string;
    title: string;
  };
}

export interface FunctionRunResult {
  operations: Operation[];
}

const NO_CHANGES: FunctionRunResult = { operations: [] };

export function run(input: RunInput): FunctionRunResult {
  const config: Configuration = input?.deliveryCustomization?.metafield?.jsonValue ?? {};
  const rules = config.rules;

  console.error(
    `[B2B Delivery Guard] Executing delivery function: metafieldPresent=${!!input?.deliveryCustomization?.metafield?.jsonValue}, rulesCount=${rules?.length ?? 0}`
  );

  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    console.error("[B2B Delivery Guard] No active delivery rules found in configuration.");
    return NO_CHANGES;
  }

  const totalAmount = parseFloat(input?.cart?.cost?.totalAmount?.amount ?? "0.0");

  // Calculate total weight from cart lines
  let totalWeight = 0;
  const cartProductTags = new Set<string>();

  for (const line of input?.cart?.lines ?? []) {
    const weight = line.merchandise?.weight ?? 0;
    totalWeight += weight * (line.quantity || 1);

    const product = line.merchandise?.product;
    for (const tagInfo of product?.hasTags ?? []) {
      if (tagInfo.hasTag) {
        cartProductTags.add(tagInfo.tag.toLowerCase());
      }
    }
  }

  const deliveryGroup = input?.cart?.deliveryGroups?.[0];
  const address = deliveryGroup?.deliveryAddress;
  const address1 = (address?.address1 ?? "").trim();
  const address2 = (address?.address2 ?? "").trim();
  const countryCode = address?.countryCode?.toUpperCase() ?? "";
  const provinceCode = address?.provinceCode?.toUpperCase() ?? "";
  const zip = (address?.zip ?? "").trim().toUpperCase();

  const deliveryOptions = deliveryGroup?.deliveryOptions ?? [];

  // Sort rules by priority ASC (1=Highest, 5=Lowest)
  const sortedRules = [...rules].sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3));

  // Target Decision Map: deliveryOptionHandle -> { action: ActionType, priority: number }
  // Precedence rule: HIDE always dominates MOVE regardless of priority.
  // Between multiple MOVE actions, the highest priority rule (lowest numeric priority) wins.
  const targetDecisions = new Map<string, { action: ActionType; priority: number }>();

  console.error(
    `[B2B Delivery Guard] Cart context: totalAmount=${totalAmount}, totalWeight=${totalWeight}, cartProductTags=${JSON.stringify(
      Array.from(cartProductTags)
    )}, address1='${address1}', address2='${address2}', country=${countryCode}, zip=${zip}, options=${JSON.stringify(
      deliveryOptions.map((o) => ({ handle: o.handle, title: o.title }))
    )}`
  );

  for (const rule of sortedRules) {
    if (rule.status !== RuleStatus.ACTIVE) {
      console.error(`[B2B Delivery Guard] Rule '${rule.name}' skipped: status is ${rule.status}`);
      continue;
    }

    // Condition 1: Minimum Total Amount
    if (typeof rule.minTotalAmount === "number" && !isNaN(rule.minTotalAmount)) {
      if (totalAmount < rule.minTotalAmount) {
        console.error(
          `[B2B Delivery Guard] Rule '${rule.name}' skipped: totalAmount (${totalAmount}) < minTotalAmount (${rule.minTotalAmount})`
        );
        continue;
      }
    }

    // Condition 2: Maximum Total Amount
    if (typeof rule.maxTotalAmount === "number" && !isNaN(rule.maxTotalAmount)) {
      if (totalAmount > rule.maxTotalAmount) {
        console.error(
          `[B2B Delivery Guard] Rule '${rule.name}' skipped: totalAmount (${totalAmount}) > maxTotalAmount (${rule.maxTotalAmount})`
        );
        continue;
      }
    }

    // Condition 3: Minimum Weight
    if (typeof rule.minTotalWeight === "number" && !isNaN(rule.minTotalWeight)) {
      if (totalWeight < rule.minTotalWeight) {
        console.error(
          `[B2B Delivery Guard] Rule '${rule.name}' skipped: totalWeight (${totalWeight}) < minTotalWeight (${rule.minTotalWeight})`
        );
        continue;
      }
    }

    // Condition 4: Maximum Weight
    if (typeof rule.maxTotalWeight === "number" && !isNaN(rule.maxTotalWeight)) {
      if (totalWeight > rule.maxTotalWeight) {
        console.error(
          `[B2B Delivery Guard] Rule '${rule.name}' skipped: totalWeight (${totalWeight}) > maxTotalWeight (${rule.maxTotalWeight})`
        );
        continue;
      }
    }

    // Condition 5: Country Code
    if (rule.countryCodes && rule.countryCodes.length > 0) {
      const normalizedCountries = rule.countryCodes.map((c) => c.trim().toUpperCase()).filter(Boolean);
      if (!countryCode || !normalizedCountries.includes(countryCode)) {
        console.error(
          `[B2B Delivery Guard] Rule '${rule.name}' skipped: country '${countryCode}' not in [${normalizedCountries.join(", ")}]`
        );
        continue;
      }
    }

    // Condition 6: Province Code
    if (rule.provinceCodes && rule.provinceCodes.length > 0) {
      const normalizedProvinces = rule.provinceCodes.map((p) => p.trim().toUpperCase()).filter(Boolean);
      if (!provinceCode || !normalizedProvinces.includes(provinceCode)) {
        console.error(
          `[B2B Delivery Guard] Rule '${rule.name}' skipped: province '${provinceCode}' not in [${normalizedProvinces.join(", ")}]`
        );
        continue;
      }
    }

    // Condition 7: Postal / Zip Code matching (also checks street address lines for REGEX patterns like PO Boxes)
    if (rule.postalCodes && rule.postalCodes.length > 0) {
      const type = rule.postalCodeType || PostalCodeType.PREFIX;
      let addressMatches = false;

      if (type === PostalCodeType.REGEX) {
        try {
          const patternString = rule.postalCodes.join("|");
          const regex = new RegExp(patternString, "i");
          // Check zip, address1, address2, or full address string
          addressMatches =
            (!!zip && regex.test(zip)) ||
            (!!address1 && regex.test(address1)) ||
            (!!address2 && regex.test(address2));
        } catch {
          addressMatches = false;
        }
      } else if (type === PostalCodeType.LIST) {
        if (!zip) {
          console.error(`[B2B Delivery Guard] Rule '${rule.name}' skipped: no zip code in address`);
          continue;
        }
        const list = rule.postalCodes.map((z) => z.trim().toUpperCase());
        addressMatches = list.includes(zip);
      } else {
        // PREFIX
        if (!zip) {
          console.error(`[B2B Delivery Guard] Rule '${rule.name}' skipped: no zip code in address`);
          continue;
        }
        const prefixes = rule.postalCodes.map((z) => z.trim().toUpperCase());
        addressMatches = prefixes.some((prefix) => zip.startsWith(prefix));
      }

      if (!addressMatches) {
        console.error(
          `[B2B Delivery Guard] Rule '${rule.name}' skipped: address/zip '${[address1, address2, zip].filter(Boolean).join(", ")}' does not match ${type} criteria [${rule.postalCodes.join(", ")}]`
        );
        continue;
      }
    }

    // Condition 8: Product Tags (e.g. "freight", "heavy")
    if (rule.productTags && rule.productTags.length > 0) {
      const normalizedTags = rule.productTags.map((t) => t.trim().toLowerCase()).filter(Boolean);
      const hasMatchingTag = normalizedTags.some((t) => cartProductTags.has(t));
      if (!hasMatchingTag) {
        console.error(
          `[B2B Delivery Guard] Rule '${rule.name}' skipped: cart missing product tags. Required: [${normalizedTags.join(", ")}], Cart: [${Array.from(cartProductTags).join(", ")}]`
        );
        continue;
      }
    }

    // All conditions met! Find matching delivery options
    const rawTarget = rule.deliveryOptionName || "";
    const targets = rawTarget
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const matchingOptions = deliveryOptions.filter((option) => {
      const title = (option.title || "").toLowerCase();
      const handle = (option.handle || "").toLowerCase();
      return targets.some((target) => title.includes(target) || handle.includes(target));
    });

    console.error(
      `[B2B Delivery Guard] Rule '${rule.name}' matched all conditions! Targets: [${targets.join(", ")}], Matching options: ${JSON.stringify(
        matchingOptions.map((o) => ({ handle: o.handle, title: o.title }))
      )}`
    );

    const rulePriority = rule.priority ?? 3;
    const ruleAction = (rule.actionType as ActionType) || ActionType.HIDE;
    const isHide = ruleAction === ActionType.HIDE;

    for (const option of matchingOptions) {
      const existing = targetDecisions.get(option.handle);

      if (!existing) {
        targetDecisions.set(option.handle, {
          action: ruleAction,
          priority: rulePriority,
        });
      } else {
        // HIDE always takes precedence over MOVE
        if (isHide) {
          targetDecisions.set(option.handle, {
            action: ActionType.HIDE,
            priority: Math.min(existing.priority, rulePriority),
          });
        } else if (existing.action !== ActionType.HIDE) {
          // Both are MOVE, higher priority (lower numeric value) wins
          if (rulePriority < existing.priority) {
            targetDecisions.set(option.handle, {
              action: ruleAction,
              priority: rulePriority,
            });
          }
        }
      }
    }
  }

  const operations: Operation[] = [];
  for (const [handle, decision] of targetDecisions.entries()) {
    if (decision.action === ActionType.MOVE_TO_TOP) {
      operations.push({
        move: {
          deliveryOptionHandle: handle,
          index: 0,
        },
      });
    } else if (decision.action === ActionType.MOVE_TO_BOTTOM) {
      operations.push({
        move: {
          deliveryOptionHandle: handle,
          index: 999,
        },
      });
    } else {
      operations.push({
        hide: {
          deliveryOptionHandle: handle,
        },
      });
    }
  }

  console.error(
    `[B2B Delivery Guard] Finished delivery execution. Returning ${operations.length} operations: ${JSON.stringify(operations)}`
  );

  return { operations };
}

