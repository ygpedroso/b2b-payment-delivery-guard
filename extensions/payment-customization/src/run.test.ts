import { describe, it, expect } from "vitest";
import { run, type RunInput } from "./run";

describe("Payment Customization Function", () => {
  const baseInput: RunInput = {
    cart: {
      cost: {
        subtotalAmount: {
          amount: "250.00",
          currencyCode: "USD",
        },
        totalAmount: {
          amount: "270.00",
          currencyCode: "USD",
        },
      },
      buyerIdentity: {
        customer: {
          id: "gid://shopify/Customer/123",
          hasTags: [
            { hasTag: true, tag: "b2b" },
            { hasTag: true, tag: "wholesale" },
            { hasTag: false, tag: "trade" },
          ],
        },
      },
      lines: [
        {
          id: "gid://shopify/CartLine/1",
          quantity: 2,
          merchandise: {
            __typename: "ProductVariant",
            id: "gid://shopify/ProductVariant/100",
            product: {
              id: "gid://shopify/Product/10",
              hasTags: [{ hasTag: true, tag: "restricted" }],
            },
          },
        },
      ],
      deliveryGroups: [
        {
          deliveryAddress: {
            countryCode: "US",
            provinceCode: "CA",
          },
        },
      ],
    },
    paymentMethods: [
      { id: "gid://shopify/PaymentMethod/1", name: "Credit Card (Shopify Payments)" },
      { id: "gid://shopify/PaymentMethod/2", name: "Cash on Delivery (COD)" },
      { id: "gid://shopify/PaymentMethod/3", name: "Klarna - Pay in 4" },
      { id: "gid://shopify/PaymentMethod/4", name: "Bank Deposit / Wire Transfer" },
    ],
    paymentCustomization: {
      metafield: null,
    },
  };

  it("returns no operations when configuration is empty", () => {
    const result = run(baseInput);
    expect(result.operations).toEqual([]);
  });

  it("hides Cash on Delivery when subtotal exceeds configured threshold ($200)", () => {
    const input: RunInput = {
      ...baseInput,
      paymentCustomization: {
        metafield: {
          jsonValue: {
            rules: [
              {
                id: "rule-1",
                name: "Hide COD over $200",
                status: "ACTIVE",
                minSubtotal: 200,
                paymentMethodName: "Cash on Delivery",
                actionType: "HIDE",
              },
            ],
          },
        },
      },
    };

    const result = run(input);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toEqual({
      hide: {
        paymentMethodId: "gid://shopify/PaymentMethod/2",
      },
    });
  });

  it("does NOT hide Cash on Delivery when subtotal is below configured threshold", () => {
    const input: RunInput = {
      ...baseInput,
      cart: {
        ...baseInput.cart,
        cost: {
          subtotalAmount: { amount: "150.00", currencyCode: "USD" },
          totalAmount: { amount: "160.00", currencyCode: "USD" },
        },
      },
      paymentCustomization: {
        metafield: {
          jsonValue: {
            rules: [
              {
                id: "rule-1",
                name: "Hide COD over $200",
                status: "ACTIVE",
                minSubtotal: 200,
                paymentMethodName: "Cash on Delivery",
                actionType: "HIDE",
              },
            ],
          },
        },
      },
    };

    const result = run(input);
    expect(result.operations).toEqual([]);
  });

  it("hides Credit Cards and Klarna for B2B tagged customers", () => {
    const input: RunInput = {
      ...baseInput,
      paymentCustomization: {
        metafield: {
          jsonValue: {
            rules: [
              {
                id: "rule-b2b-cc",
                name: "Hide Credit Card for B2B",
                status: "ACTIVE",
                customerTags: ["b2b"],
                customerTagsMatch: "ANY",
                paymentMethodName: "Credit Card",
                actionType: "HIDE",
              },
              {
                id: "rule-b2b-klarna",
                name: "Hide Klarna for B2B",
                status: "ACTIVE",
                customerTags: ["b2b"],
                customerTagsMatch: "ANY",
                paymentMethodName: "Klarna",
                actionType: "HIDE",
              },
            ],
          },
        },
      },
    };

    const result = run(input);
    expect(result.operations).toHaveLength(2);
    expect(result.operations).toEqual([
      { hide: { paymentMethodId: "gid://shopify/PaymentMethod/1" } },
      { hide: { paymentMethodId: "gid://shopify/PaymentMethod/3" } },
    ]);
  });

  it("enforces ALL customer tags match when configured", () => {
    const input: RunInput = {
      ...baseInput,
      paymentCustomization: {
        metafield: {
          jsonValue: {
            rules: [
              {
                id: "rule-all-tags",
                name: "Require wholesale AND trade",
                status: "ACTIVE",
                customerTags: ["wholesale", "trade"],
                customerTagsMatch: "ALL",
                paymentMethodName: "Credit Card",
                actionType: "HIDE",
              },
            ],
          },
        },
      },
    };

    // Customer only has wholesale, missing trade
    const result = run(input);
    expect(result.operations).toEqual([]);
  });

  it("filters rules by country code and moves method to bottom", () => {
    const input: RunInput = {
      ...baseInput,
      paymentCustomization: {
        metafield: {
          jsonValue: {
            rules: [
              {
                id: "rule-move-cod-us",
                name: "Move COD to bottom for US",
                status: "ACTIVE",
                countryCodes: ["US"],
                paymentMethodName: "Cash on Delivery",
                actionType: "MOVE_TO_BOTTOM",
              },
            ],
          },
        },
      },
    };

    const result = run(input);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toEqual({
      move: {
        paymentMethodId: "gid://shopify/PaymentMethod/2",
        index: 999,
      },
    });
  });

  it("ignores DRAFT rules", () => {
    const input: RunInput = {
      ...baseInput,
      paymentCustomization: {
        metafield: {
          jsonValue: {
            rules: [
              {
                id: "rule-draft",
                name: "Draft rule",
                status: "DRAFT",
                paymentMethodName: "Cash on Delivery",
                actionType: "HIDE",
              },
            ],
          },
        },
      },
    };

    const result = run(input);
    expect(result.operations).toEqual([]);
  });

  it("matches multiple payment methods using comma-separated aliases", () => {
    const devStoreInput: RunInput = {
      ...baseInput,
      paymentMethods: [
        { id: "gid://shopify/PaymentMethod/dev-test", name: "Test payment gateway" },
        { id: "gid://shopify/PaymentMethod/bank", name: "Bank Deposit / Wire Transfer" },
      ],
      paymentCustomization: {
        metafield: {
          jsonValue: {
            rules: [
              {
                id: "rule-b2b-cc",
                name: "Hide Credit Card and Test Gateway for B2B",
                status: "ACTIVE",
                customerTags: ["b2b"],
                paymentMethodName: "Credit Card, Test payment gateway",
                actionType: "HIDE",
              },
            ],
          },
        },
      },
    };

    const result = run(devStoreInput);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toEqual({
      hide: {
        paymentMethodId: "gid://shopify/PaymentMethod/dev-test",
      },
    });
  });

  it("supports comma-separated payment method aliases", () => {
    const devStoreInput: RunInput = {
      ...baseInput,
      paymentMethods: [
        { id: "gid://shopify/PaymentMethod/1", name: "Custom B2B Invoice Gateway" },
        { id: "gid://shopify/PaymentMethod/2", name: "Cash on Delivery (COD)" },
      ],
      paymentCustomization: {
        metafield: {
          jsonValue: {
            rules: [
              {
                id: "rule-multi-target",
                name: "Hide COD or B2B Invoice",
                status: "ACTIVE",
                paymentMethodName: "Custom B2B, Cash on Delivery",
                actionType: "HIDE",
              },
            ],
          },
        },
      },
    };

    const result = run(devStoreInput);
    expect(result.operations).toHaveLength(2);
    expect(result.operations).toEqual([
      { hide: { paymentMethodId: "gid://shopify/PaymentMethod/1" } },
      { hide: { paymentMethodId: "gid://shopify/PaymentMethod/2" } },
    ]);
  });

  it("ensures HIDE always dominates MOVE_TO_BOTTOM regardless of rule priority or order", () => {
    const input: RunInput = {
      ...baseInput,
      paymentCustomization: {
        metafield: {
          jsonValue: {
            rules: [
              {
                id: "rule-move-first",
                name: "Move COD to bottom (Priority 1 Highest)",
                status: "ACTIVE",
                priority: 1,
                paymentMethodName: "Cash on Delivery",
                actionType: "MOVE_TO_BOTTOM",
              },
              {
                id: "rule-hide-second",
                name: "Hide COD (Priority 4 Low)",
                status: "ACTIVE",
                priority: 4,
                paymentMethodName: "Cash on Delivery",
                actionType: "HIDE",
              },
            ],
          },
        },
      },
    };

    const result = run(input);
    // HIDE must dominate, so Cash on Delivery should be HIDDEN, NOT MOVED
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toEqual({
      hide: {
        paymentMethodId: "gid://shopify/PaymentMethod/2",
      },
    });
  });

  it("evaluates rules in priority order when multiple non-conflicting rules match", () => {
    const input: RunInput = {
      ...baseInput,
      paymentCustomization: {
        metafield: {
          jsonValue: {
            rules: [
              {
                id: "rule-low",
                name: "Hide Klarna (Priority 4 Low)",
                status: "ACTIVE",
                priority: 4,
                paymentMethodName: "Klarna",
                actionType: "HIDE",
              },
              {
                id: "rule-high",
                name: "Hide Credit Card (Priority 1 Highest)",
                status: "ACTIVE",
                priority: 1,
                paymentMethodName: "Credit Card",
                actionType: "HIDE",
              },
            ],
          },
        },
      },
    };

    const result = run(input);
    expect(result.operations).toHaveLength(2);
    expect(result.operations).toContainEqual({
      hide: { paymentMethodId: "gid://shopify/PaymentMethod/1" },
    });
    expect(result.operations).toContainEqual({
      hide: { paymentMethodId: "gid://shopify/PaymentMethod/3" },
    });
  });
});

