import type { ProviderDefinition } from "../../core/types.ts";

import { mailosaurActions } from "./actions.ts";

const service = "mailosaur";

export const provider: ProviderDefinition = {
  service,
  displayName: "Mailosaur",
  categories: ["Communication", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "mailosaur_api_key",
      description:
        "Mailosaur API key used as the HTTP Basic auth password with username api. Create or manage API keys in the Mailosaur Dashboard.",
    },
  ],
  homepageUrl: "https://mailosaur.com",
  actions: mailosaurActions,
};
