import type { ProviderDefinition } from "../../core/types.ts";

import { databoxActions } from "./actions.ts";

const service = "databox";

export const provider: ProviderDefinition = {
  service,
  displayName: "Databox",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DATABOX_API_KEY",
      description: "Databox API key sent with the x-api-key request header.",
    },
  ],
  homepageUrl: "https://databox.com/",
  actions: databoxActions,
};
