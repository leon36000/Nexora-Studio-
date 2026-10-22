import type { ProviderDefinition } from "../../core/types.ts";

import { httpsmsActions } from "./actions.ts";

const service = "httpsms";

export const provider: ProviderDefinition = {
  service,
  displayName: "httpSMS",
  description: "Send and manage SMS and MMS messages through an Android phone connected to httpSMS.",
  categories: ["Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "HTTPSMS_API_KEY",
      description:
        "httpSMS API key sent with the x-api-key request header. Create or copy your API key in the httpSMS settings page: https://httpsms.com/settings.",
    },
  ],
  homepageUrl: "https://httpsms.com/",
  actions: httpsmsActions,
};
