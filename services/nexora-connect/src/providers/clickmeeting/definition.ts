import type { ProviderDefinition } from "../../core/types.ts";

import { clickMeetingActions } from "./actions.ts";

const service = "clickmeeting";

export const provider: ProviderDefinition = {
  service,
  displayName: "ClickMeeting",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CLICKMEETING_API_KEY",
      description:
        "ClickMeeting API key sent in the X-Api-Key header. Generate or view it in ClickMeeting account settings: https://account-panel.clickmeeting.com/account/details#api.",
    },
  ],
  homepageUrl: "https://clickmeeting.com/",
  actions: clickMeetingActions,
};
