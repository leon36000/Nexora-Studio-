import type { ProviderDefinition } from "../../core/types.ts";

import { polygonIoActions } from "./actions.ts";

const service = "polygon_io";

export const provider: ProviderDefinition = {
  service,
  displayName: "Massive (Polygon.io)",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "POLYGON_IO_API_KEY",
      description:
        "Massive (formerly Polygon.io) REST API key passed as the apiKey query parameter. Get it from your dashboard keys page: https://massive.com/dashboard/keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://massive.com/",
  actions: polygonIoActions,
};
