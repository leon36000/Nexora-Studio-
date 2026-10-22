import type { ProviderDefinition } from "../../core/types.ts";

import { smsAlertActions } from "./actions.ts";

const service = "sms_alert";

export const provider: ProviderDefinition = {
  service,
  displayName: "SMS Alert",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "sms_alert_api_key",
      description:
        "SMS Alert API key sent as the apikey query parameter. Sign in to SMS Alert, open Developers, then API keys to view or create one: https://kb.smsalert.co.in/knowledgebase/api-kit/",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.smsalert.co.in/",
  actions: smsAlertActions,
};
