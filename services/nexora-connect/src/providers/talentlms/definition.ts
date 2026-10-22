import type { ProviderDefinition } from "../../core/types.ts";

import { talentlmsActions } from "./actions.ts";

const service = "talentlms";

export const provider: ProviderDefinition = {
  service,
  displayName: "TalentLMS",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "talentlms_api_key",
      description:
        "TalentLMS API key sent with the X-API-Key header. Enable the API and generate a key in TalentLMS under Account & Settings > Integrations > API: https://help.talentlms.com/hc/en-us/articles/9651527213468-Can-I-integrate-my-site-with-TalentLMS-Do-you-offer-an-API.",
      extraFields: [
        {
          key: "domain",
          label: "Domain",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "samples or samples.talentlms.com",
          description:
            "Your TalentLMS portal domain or subdomain. If your portal is samples.talentlms.com, enter samples or samples.talentlms.com.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.talentlms.com",
  actions: talentlmsActions,
};
