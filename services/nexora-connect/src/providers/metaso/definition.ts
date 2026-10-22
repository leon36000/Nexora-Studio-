import type { ProviderDefinition } from "../../core/types.ts";

import { metasoActions } from "./actions.ts";

const service = "metaso";

export const provider: ProviderDefinition = {
  service,
  displayName: "Metaso",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "mk-xxxxxxxxxxxxxxxx",
      description:
        "Metaso API key used with the Authorization Bearer header. Create or copy it on the API Keys page: https://metaso.cn/search-api/api-keys",
    },
  ],
  homepageUrl: "https://metaso.cn",
  actions: metasoActions,
};
