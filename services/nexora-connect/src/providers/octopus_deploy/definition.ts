import type { ProviderDefinition } from "../../core/types.ts";

import { octopusDeployActions } from "./actions.ts";

const service = "octopus_deploy";

export const provider: ProviderDefinition = {
  service,
  displayName: "Octopus Deploy",
  description: "Manage spaces, projects, environments, releases, deployments, and tasks in Octopus Deploy.",
  categories: ["Developer Tools", "Infrastructure"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "API-...",
      description:
        "Octopus Deploy API key sent with the X-Octopus-ApiKey header. Create or copy a key from your Octopus Web Portal profile under My API Keys: https://octopus.com/docs/octopus-rest-api/how-to-create-an-api-key.",
      extraFields: [
        {
          key: "baseUrl",
          label: "Instance URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://your-octopus-url",
          description:
            "The HTTP or HTTPS URL of your Octopus Deploy Cloud or self-hosted instance. Public addresses work by default; private-network instances require the self-hosted runtime to enable OOMOL_CONNECT_ALLOW_PRIVATE_NETWORK.",
        },
      ],
    },
  ],
  homepageUrl: "https://octopus.com",
  actions: octopusDeployActions,
};
