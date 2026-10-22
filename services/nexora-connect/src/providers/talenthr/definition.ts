import type { ProviderDefinition } from "../../core/types.ts";

import { talenthrActions } from "./actions.ts";

const service = "talenthr";

export const provider: ProviderDefinition = {
  service,
  displayName: "TalentHR",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "talenthr_api_key",
      description:
        "TalentHR API key used as the Basic Auth username. Generate it in TalentHR under Settings > Domain settings > API.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.talenthr.io/",
  actions: talenthrActions,
};
