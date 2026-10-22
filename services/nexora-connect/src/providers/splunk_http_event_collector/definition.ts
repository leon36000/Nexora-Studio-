import type { ProviderDefinition } from "../../core/types.ts";

import { splunkHttpEventCollectorActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "splunk_http_event_collector",
  displayName: "Splunk HTTP Event Collector",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "HEC Token",
      placeholder: "SPLUNK_HEC_TOKEN",
      description:
        "Splunk HTTP Event Collector token sent with the Authorization header. Configure it in Splunk Web under Settings > Data Inputs > HTTP Event Collector.",
      extraFields: [
        {
          key: "baseUrl",
          label: "HEC Base URL",
          required: true,
          secret: false,
          inputType: "text",
          placeholder: "https://http-inputs-example.splunkcloud.com:8088",
          description: "The HTTPS origin of your Splunk HTTP Event Collector, including its configured port.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.splunk.com",
  actions: splunkHttpEventCollectorActions,
};
