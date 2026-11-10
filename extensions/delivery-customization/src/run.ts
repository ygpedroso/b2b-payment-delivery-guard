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
  deliveryOptionHide?: {
    deliveryOptionHandle: string;
  };
  deliveryOptionMove?: {
    deliveryOptionHandle: string;
    index: number;
  };
}

export interface FunctionRunResult {
  operations: Operation[];
}

const NO_CHANGES: FunctionRunResult = { operations: [] };

export function run(input: RunInput): FunctionRunResult {
  const config: Configuration = input?.deliveryCustomization?.metafield?.jsonValue ?? {};
  const rules = config.rules;

  if (!rules || !Array.isArray(rules) || rules.length === 0) {
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
  const countryCode = address?.countryCode?.toUpperCase() ?? "";
  const provinceCode = address?.provinceCode?.toUpperCase() ?? "";
  const zip = (address?.zip ?? "").trim().toUpperCase();

  const deliveryOptions = deliveryGroup?.deliveryOptions ?? [];
  const operations: Operation[] = [];
  const processedHandles = new Set<string>();

  for (const rule of rules) {
    if (rule.status !== RuleStatus.ACTIVE) {
      continue;
    }

    // Condition 1: Minimum Total Amount
    if (typeof rule.minTotalAmount === "number" && !isNaN(rule.minTotalAmount)) {
      if (totalAmount < rule.minTotalAmount) {
        continue;
      }
    }

    // Condition 2: Maximum Total Amount
    if (typeof rule.maxTotalAmount === "number" && !isNaN(rule.maxTotalAmount)) {
      if (totalAmount > rule.maxTotalAmount) {
        continue;
      }
    }

    // Condition 3: Minimum Weight
    if (typeof rule.minTotalWeight === "number" && !isNaN(rule.minTotalWeight)) {
      if (totalWeight < rule.minTotalWeight) {
        continue;
      }
    }

    // Condition 4: Maximum Weight
    if (typeof rule.maxTotalWeight === "number" && !isNaN(rule.maxTotalWeight)) {
      if (totalWeight > rule.maxTotalWeight) {
        continue;
      }
    }

    // Condition 5: Country Code
    if (rule.countryCodes && rule.countryCodes.length > 0) {
      const normalizedCountries = rule.countryCodes.map((c) => c.trim().toUpperCase()).filter(Boolean);
      if (!countryCode || !normalizedCountries.includes(countryCode)) {
        continue;
      }
    }

    // Condition 6: Province Code
    if (rule.provinceCodes && rule.provinceCodes.length > 0) {
      const normalizedProvinces = rule.provinceCodes.map((p) => p.trim().toUpperCase()).filter(Boolean);
      if (!provinceCode || !normalizedProvinces.includes(provinceCode)) {
        continue;
      }
    }

    // Condition 7: Postal / Zip Code matching
    if (rule.postalCodes && rule.postalCodes.length > 0) {
      const type = rule.postalCodeType || PostalCodeType.PREFIX;
      let zipMatches = false;

      if (!zip) {
        continue;
      }

      if (type === PostalCodeType.REGEX) {
        try {
          const patternString = rule.postalCodes.join("|");
          const regex = new RegExp(patternString, "i");
          zipMatches = regex.test(zip);
        } catch {
          zipMatches = false;
        }
      } else if (type === PostalCodeType.LIST) {
        const list = rule.postalCodes.map((z) => z.trim().toUpperCase());
        zipMatches = list.includes(zip);
      } else {
        // PREFIX
        const prefixes = rule.postalCodes.map((z) => z.trim().toUpperCase());
        zipMatches = prefixes.some((prefix) => zip.startsWith(prefix));
      }

      if (!zipMatches) {
        continue;
      }
    }

    // Condition 8: Product Tags (e.g. "freight", "heavy")
    if (rule.productTags && rule.productTags.length > 0) {
      const normalizedTags = rule.productTags.map((t) => t.trim().toLowerCase()).filter(Boolean);
      const hasMatchingTag = normalizedTags.some((t) => cartProductTags.has(t));
      if (!hasMatchingTag) {
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

    for (const option of matchingOptions) {
      if (processedHandles.has(option.handle)) {
        continue;
      }

      if (rule.actionType === ActionType.MOVE_TO_TOP) {
        operations.push({
          deliveryOptionMove: {
            deliveryOptionHandle: option.handle,
            index: 0,
          },
        });
        processedHandles.add(option.handle);
      } else if (rule.actionType === ActionType.MOVE_TO_BOTTOM) {
        operations.push({
          deliveryOptionMove: {
            deliveryOptionHandle: option.handle,
            index: 999,
          },
        });
        processedHandles.add(option.handle);
      } else {
        // HIDE
        operations.push({
          deliveryOptionHide: {
            deliveryOptionHandle: option.handle,
          },
        });
        processedHandles.add(option.handle);
      }
    }
  }

  return { operations };
}
