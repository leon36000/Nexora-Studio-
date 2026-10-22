import type { ProviderDefinition } from "../../core/types.ts";

import { mezmoActions } from "./actions.ts";

const service = "mezmo";

export const provider: ProviderDefinition = {
  service,
  displayName: "Mezmo",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "MEZMO_ACCESS_TOKEN",
      description:
        "Mezmo access token used with the Authorization: Token header. Create a personal access key or service account access key by following the Mezmo IAM guidance at https://docs.mezmo.com/2.8/docs/authenticating-with-the-api.",
    },
  ],
  homepageUrl: "https://www.mezmo.com",
  actions: mezmoActions,
};
