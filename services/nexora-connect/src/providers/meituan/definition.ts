import type { ProviderDefinition } from "../../core/types.ts";

import { meituanActions } from "./actions.ts";

const service = "meituan";

export const provider: ProviderDefinition = {
  service,
  displayName: "Meituan",
  description: "Query Meituan Travel for flights, trains, hotels, attractions, itineraries, and local transportation.",
  categories: ["Productivity", "Location"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Developer Token",
      placeholder: "MEITUAN_TOKEN",
      description:
        "Meituan personal developer Token used to query Meituan Travel. Complete personal developer verification and create a Token at https://developer.meituan.com/zh/v2/dev/token. The Token is verified when the first travel query runs because Meituan does not provide a lightweight validation endpoint.",
    },
  ],
  homepageUrl: "https://www.meituan.com",
  actions: meituanActions,
};
