import type { ProviderDefinition } from "../../core/types.ts";

import { ipregistryActions } from "./actions.ts";

const service = "ipregistry";

/**
 * Ipregistry provider backed by public IP, ASN, and user-agent lookup APIs.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Ipregistry",
  categories: ["Location", "Security", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "IPREGISTRY_API_KEY",
      description:
        "Ipregistry API key used in the Authorization: ApiKey header. View and manage keys at https://dashboard.ipregistry.co/signin?redirect=/keys.",
    },
  ],
  homepageUrl: "https://ipregistry.co",
  actions: ipregistryActions,
};
