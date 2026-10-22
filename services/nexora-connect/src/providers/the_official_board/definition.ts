import type { ProviderDefinition } from "../../core/types.ts";

import { theOfficialBoardActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "the_official_board",
  displayName: "The Official Board",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "REST API Token",
      placeholder: "THE_OFFICIAL_BOARD_TOKEN",
      description:
        "Security token sent in The Official Board token header. Manage it at https://www.theofficialboard.com/account/preferences/rest-api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.theofficialboard.com/",
  actions: theOfficialBoardActions,
};
