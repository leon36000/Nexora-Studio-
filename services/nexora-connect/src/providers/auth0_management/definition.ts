import type { ProviderDefinition } from "../../core/types.ts";

import { auth0ManagementActions } from "./actions.ts";

const service = "auth0_management";

/**
 * Auth0 Management provider backed by the Auth0 Management API v2.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Auth0 Management",
  categories: ["Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Management API access token",
      placeholder: "AUTH0_MANAGEMENT_API_TOKEN",
      description:
        "Auth0 Management API access token sent as a Bearer token. Create a Machine-to-Machine application and authorize it for the Auth0 Management API.",
      extraFields: [
        {
          key: "domain",
          label: "Tenant domain",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "example.us.auth0.com",
          description:
            "Auth0 tenant domain used to build https://TENANT_DOMAIN/api/v2 requests. Use the domain from your Auth0 application or tenant settings.",
        },
      ],
    },
  ],
  homepageUrl: "https://auth0.com",
  actions: auth0ManagementActions,
};
