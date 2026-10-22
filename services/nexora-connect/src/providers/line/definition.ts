import type { ProviderDefinition } from "../../core/types.ts";

import { lineActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "line",
  displayName: "LINE",
  categories: ["Communication", "Social"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Channel Access Token",
      placeholder: "LINE_CHANNEL_ACCESS_TOKEN",
      description:
        "LINE Messaging API channel access token sent as a Bearer credential. Manage it at https://developers.line.biz/console/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://line.me",
  actions: lineActions,
};
