import type { ProviderDefinition } from "../../core/types.ts";

import { laravelCloudActions } from "./actions.ts";

const service = "laravel_cloud";

/**
 * Laravel Cloud provider backed by the official Laravel Cloud API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Laravel Cloud",
  categories: ["Developer Tools", "Storage"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "LARAVEL_CLOUD_API_TOKEN",
      description:
        "Laravel Cloud API token used with the Authorization: Bearer header. Create it from your Laravel Cloud organization settings under API tokens: https://cloud.laravel.com/docs/api/authentication",
    },
  ],
  homepageUrl: "https://cloud.laravel.com",
  actions: laravelCloudActions,
};
