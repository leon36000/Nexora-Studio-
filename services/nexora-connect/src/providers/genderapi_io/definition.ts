import type { ProviderDefinition } from "../../core/types.ts";

import { genderapiIoActions } from "./actions.ts";

const service = "genderapi_io";

/**
 * GenderAPI.io gender inference provider.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "GenderAPI.io",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "GENDERAPI_IO_API_KEY",
      description:
        "GenderAPI.io API key passed with the key query parameter. Register for an account and manage your key in the GenderAPI.io app: https://app.genderapi.io/user/register",
    },
  ],
  homepageUrl: "https://www.genderapi.io",
  actions: genderapiIoActions,
};
