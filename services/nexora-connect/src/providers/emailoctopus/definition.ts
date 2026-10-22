import type { ProviderDefinition } from "../../core/types.ts";

import { emailoctopusActions } from "./actions.ts";

const service = "emailoctopus";

export const provider: ProviderDefinition = {
  service,
  displayName: "EmailOctopus",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "00000000-0000-0000-0000-000000000000",
      description:
        "EmailOctopus API key used by the official v1 API. Create or manage it from the API key screen in your EmailOctopus account: https://help.emailoctopus.com/article/165-how-to-create-and-delete-api-keys",
    },
  ],
  homepageUrl: "https://emailoctopus.com",
  actions: emailoctopusActions,
};
