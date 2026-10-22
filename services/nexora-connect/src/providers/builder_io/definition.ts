import type { ProviderDefinition } from "../../core/types.ts";

import { builderIoActions } from "./actions.ts";

const service = "builder_io";

export const provider: ProviderDefinition = {
  service,
  displayName: "Builder.io",
  categories: ["Design & Media", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Private API Key",
      placeholder: "BUILDER_IO_PRIVATE_KEY",
      description:
        "Builder.io private API key used with the Authorization Bearer header for Write API requests. Find private and public keys in your Builder.io organization settings: https://builder.io/account/organization.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.builder.io",
  actions: builderIoActions,
};
