import type { ProviderDefinition } from "../../core/types.ts";

import { klicktippActions } from "./actions.ts";

const service = "klicktipp";

/**
 * KlickTipp Listbuilding API provider.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "KlickTipp",
  categories: ["Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Listbuilding API Key",
      placeholder: "KLICKTIPP_LISTBUILDING_API_KEY",
      description:
        "KlickTipp Listbuilding API key sent as the apikey JSON body field. Create it in KlickTipp under List Building > New List Building > Entry via API key: https://developers.klicktipp.com/guides/listbuilding-api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.klicktipp.com",
  actions: klicktippActions,
};
