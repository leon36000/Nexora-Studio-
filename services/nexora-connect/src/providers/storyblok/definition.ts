import type { ProviderDefinition } from "../../core/types.ts";

import { storyblokActions } from "./actions.ts";

const service = "storyblok";

export const provider: ProviderDefinition = {
  service,
  displayName: "Storyblok",
  categories: ["Productivity", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Content Delivery API Access Token",
      placeholder: "STORYBLOK_ACCESS_TOKEN",
      description:
        "Storyblok Content Delivery API public or preview token sent as the token query parameter. Create or manage per-space tokens from a Storyblok space under Settings > Access Tokens: https://www.storyblok.com/docs/concepts/access-tokens.",
      extraFields: [
        {
          key: "region",
          label: "Space Region",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "eu",
          description:
            "Storyblok space server location used to choose the Content Delivery API endpoint. Use one of eu, us, ca, ap, or cn as documented in the Content Delivery API introduction: https://www.storyblok.com/docs/api/content-delivery/v2.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.storyblok.com",
  actions: storyblokActions,
};
