import { describe, it, expect } from "vitest";
import { run, type RunInput } from "./run";

describe("Delivery Customization Function", () => {
  const baseInput: RunInput = {
    cart: {
      cost: {
        subtotalAmount: { amount: "400.00", currencyCode: "USD" },
        totalAmount: { amount: "450.00", currencyCode: "USD" },
      },
      lines: [
        {
          id: "gid://shopify/CartLine/1",
          quantity: 2,
          merchandise: {
            __typename: "ProductVariant",
            id: "gid://shopify/ProductVariant/10",
            weight: 25.0,
            weightUnit: "POUNDS",
            product: {
              id: "gid://shopify/Product/1",
              hasTags: [{ hasTag: true, tag: "freight" }],
            },
          },
        },
      ],
      deliveryGroups: [
        {
          deliveryAddress: {
            countryCode: "US",
            provinceCode: "CA",
            zip: "90210",
          },
          deliveryOptions: [
            {
              handle: "shipping-standard-ground",
              title: "Standard Ground Shipping",
              cost: { amount: "15.00", currencyCode: "USD" },
            },
            {
              handle: "shipping-express-air",
              title: "Express 2-Day Air",
              cost: { amount: "45.00", currencyCode: "USD" },
            },
            {
              handle: "carrier-b2b-freight-ltl",
              title: "Contracted B2B Freight (LTL)",
              cost: { amount: "95.00", currencyCode: "USD" },
            },
          ],
        },
      ],
    },
    deliveryCustomization: {
      metafield: null,
    },
  };

  it("returns no operations when configuration is empty", () => {
    const result = run(baseInput);
    expect(result.operations).toEqual([]);
  });

  it("hides Express delivery option when freight products are in cart", () => {
    const input: RunInput = {
      ...baseInput,
      deliveryCustomization: {
        metafield: {
          jsonValue: {
            rules: [
              {
                id: "rule-freight-no-express",
                name: "Hide Express for Freight",
                status: "ACTIVE",
                productTags: ["freight"],
                deliveryOptionName: "Express",
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
      deliveryOptionHide: {
        deliveryOptionHandle: "shipping-express-air",
      },
    });
  });

  it("hides delivery options matching postal code prefix", () => {
    const input: RunInput = {
      ...baseInput,
      deliveryCustomization: {
        metafield: {
          jsonValue: {
            rules: [
              {
                id: "rule-remote-zip",
                name: "Hide standard for remote 902xx",
                status: "ACTIVE",
                postalCodes: ["902"],
                postalCodeType: "PREFIX",
                deliveryOptionName: "Standard",
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
      deliveryOptionHide: {
        deliveryOptionHandle: "shipping-standard-ground",
      },
    });
  });

  it("restricts options using regex pattern (e.g. PO Box pattern)", () => {
    const inputWithPOBox: RunInput = {
      ...baseInput,
      cart: {
        ...baseInput.cart,
        deliveryGroups: [
          {
            ...baseInput.cart.deliveryGroups![0],
            deliveryAddress: {
              countryCode: "US",
              provinceCode: "NY",
              zip: "PO BOX 123",
            },
          },
        ],
      },
      deliveryCustomization: {
        metafield: {
          jsonValue: {
            rules: [
              {
                id: "rule-po-box",
                name: "Hide B2B freight for PO Boxes",
                status: "ACTIVE",
                postalCodes: ["^P\\.?O\\.?\\s?BOX"],
                postalCodeType: "REGEX",
                deliveryOptionName: "Freight",
                actionType: "HIDE",
              },
            ],
          },
        },
      },
    };

    const result = run(inputWithPOBox);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toEqual({
      deliveryOptionHide: {
        deliveryOptionHandle: "carrier-b2b-freight-ltl",
      },
    });
  });

  it("moves contracted B2B freight rates to top", () => {
    const input: RunInput = {
      ...baseInput,
      deliveryCustomization: {
        metafield: {
          jsonValue: {
            rules: [
              {
                id: "rule-prioritize-freight",
                name: "Prioritize B2B Freight",
                status: "ACTIVE",
                deliveryOptionName: "Freight",
                actionType: "MOVE_TO_TOP",
              },
            ],
          },
        },
      },
    };

    const result = run(input);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toEqual({
      deliveryOptionMove: {
        deliveryOptionHandle: "carrier-b2b-freight-ltl",
        index: 0,
      },
    });
  });

  it("filters rules by cart total weight threshold", () => {
    // Total weight in baseInput is 2 * 25.0 = 50.0
    const input: RunInput = {
      ...baseInput,
      deliveryCustomization: {
        metafield: {
          jsonValue: {
            rules: [
              {
                id: "rule-heavy-weight",
                name: "Hide Standard for orders over 100 lbs",
                status: "ACTIVE",
                minTotalWeight: 100.0,
                deliveryOptionName: "Standard",
                actionType: "HIDE",
              },
            ],
          },
        },
      },
    };

    // Weight is 50.0 (< 100.0), so condition is NOT met
    const result = run(input);
    expect(result.operations).toEqual([]);
  });

  it("ignores DRAFT delivery rules", () => {
    const input: RunInput = {
      ...baseInput,
      deliveryCustomization: {
        metafield: {
          jsonValue: {
            rules: [
              {
                id: "rule-draft-del",
                name: "Draft Delivery Rule",
                status: "DRAFT",
                deliveryOptionName: "Express",
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
});
