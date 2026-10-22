import type { ProviderDefinition } from "../../core/types.ts";

import { terraformActions } from "./actions.ts";

const service = "terraform";

export const provider: ProviderDefinition = {
  service,
  displayName: "Terraform",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "TERRAFORM_API_TOKEN",
      description:
        "HCP Terraform API token used with the Authorization Bearer header. Create or view user, team, or organization API tokens in HCP Terraform token settings: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/api-tokens.",
    },
  ],
  homepageUrl: "https://www.hashicorp.com/products/terraform",
  actions: terraformActions,
};
