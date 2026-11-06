import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  AppProvider as PolarisAppProvider,
  Banner,
  BlockStack,
  Button,
  Card,
  Page,
  Text,
} from "@shopify/polaris";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { polarisTranslations };
};

export const action = async () => {
  return null;
};

export default function Auth() {
  const { polarisTranslations } = useLoaderData<typeof loader>();

  return (
    <PolarisAppProvider i18n={polarisTranslations}>
      <Page title="App Installation">
        <Card>
          <BlockStack gap="400">
            <Banner title="Installation requirement" tone="info">
              <p>
                To install and use B2B Payment & Delivery Guard, please initiate
                installation directly from the Shopify App Store or from your
                Shopify Admin.
              </p>
            </Banner>
            <Text as="p" variant="bodyMd" tone="subdued">
              In accordance with Shopify App Store requirements (Requirement 2.3.1),
              manual store domain entry is not supported. Please launch the app from a
              Shopify-owned surface.
            </Text>
            <div>
              <Button
                variant="primary"
                url="https://apps.shopify.com"
                target="_blank"
              >
                Go to Shopify App Store
              </Button>
            </div>
          </BlockStack>
        </Card>
      </Page>
    </PolarisAppProvider>
  );
}
