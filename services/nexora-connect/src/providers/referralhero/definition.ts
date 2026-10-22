import type { ProviderDefinition } from "../../core/types.ts";

import { referralheroActions } from "./actions.ts";
export const provider: ProviderDefinition = {
  service: "referralhero",
  displayName: "ReferralHero",
  categories: ["Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "REFERRALHERO_API_TOKEN",
      description: "ReferralHero API token sent as a Bearer token. Find it in Dashboard > Account > API.",
    },
  ],
  homepageUrl: "https://referralhero.com",
  actions: referralheroActions,
};
