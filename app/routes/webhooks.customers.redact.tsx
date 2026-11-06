import type { ActionFunctionArgs } from "@remix-run/node";
import { handleComplianceWebhook } from "../compliance.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  return handleComplianceWebhook(request);
};
