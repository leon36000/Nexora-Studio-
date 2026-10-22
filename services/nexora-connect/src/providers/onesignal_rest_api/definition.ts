import type { ProviderDefinition } from "../../core/types.ts";

import { onesignalRestApiActions } from "./actions.ts";

const service = "onesignal_rest_api";

export const provider: ProviderDefinition = {
  service,
  displayName: "OneSignal",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "App API Key",
      placeholder: "ONESIGNAL_APP_API_KEY",
      description:
        "OneSignal app API key used with the Authorization: Key header for app-scoped REST API requests. Find it in Settings > Keys & IDs for the target app: https://documentation.onesignal.com/docs/en/keys-and-ids",
      extraFields: [
        {
          key: "appId",
          label: "App ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "11111111-1111-4111-8111-111111111111",
          description:
            "OneSignal app UUID sent as app_id on every request. Copy it from Settings > Keys & IDs for the target app: https://documentation.onesignal.com/docs/en/keys-and-ids",
        },
      ],
    },
  ],
  homepageUrl: "https://onesignal.com",
  actions: onesignalRestApiActions,
};
