import type { ProviderDefinition } from "../../core/types.ts";

import { grafanaCloudActions } from "./actions.ts";

const service = "grafana_cloud";

export const provider: ProviderDefinition = {
  service,
  displayName: "Grafana Cloud",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Cloud Access Policy Token",
      placeholder: "GRAFANA_CLOUD_ACCESS_POLICY_TOKEN",
      description:
        "Grafana Cloud Access Policy token sent as a Bearer token. Create or view tokens in Grafana Cloud Access Policies: https://grafana.com/docs/grafana-cloud/security-and-account-management/authentication-and-permissions/access-policies/",
      extraFields: [
        {
          key: "orgSlug",
          label: "Organization Slug",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "grafanacom",
          description:
            "Grafana Cloud organization slug used in /api/orgs/<ORG_SLUG> endpoints. Find it in your Grafana Cloud Portal organization URL or Cloud API examples.",
        },
      ],
    },
  ],
  homepageUrl: "https://grafana.com/products/cloud/",
  actions: grafanaCloudActions,
};
