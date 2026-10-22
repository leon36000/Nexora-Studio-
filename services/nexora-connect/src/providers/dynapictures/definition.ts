import type { ProviderDefinition } from "../../core/types.ts";

import { dynapicturesActions } from "./actions.ts";

const service = "dynapictures";

export const provider: ProviderDefinition = {
  service,
  displayName: "DynaPictures",
  categories: ["Design & Media", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DYNAPICTURES_API_KEY",
      description:
        "DynaPictures API key sent as an Authorization Bearer token. Sign in and copy it from the account page or a template API console; new users can register at https://dynapictures.com/b/p/register.",
    },
  ],
  homepageUrl: "https://dynapictures.com/",
  actions: dynapicturesActions,
};
