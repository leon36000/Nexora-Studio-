import type { ProviderDefinition } from "../../core/types.ts";

import { sheetDbActions } from "./actions.ts";

const service = "sheetdb";

export const provider: ProviderDefinition = {
  service,
  displayName: "SheetDB",
  categories: ["Data", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Bearer Token",
      placeholder: "SHEETDB_ACCESS_TOKEN",
      description:
        "SheetDB bearer token for one spreadsheet API. Find it in that API's Settings tab: https://sheetdb.io/app/apis",
      extraFields: [
        {
          key: "apiId",
          label: "API ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "58f61be4dda40",
          description: "SheetDB API ID from the API URL or the APIs dashboard: https://sheetdb.io/app/apis",
        },
      ],
    },
  ],
  homepageUrl: "https://sheetdb.io",
  actions: sheetDbActions,
};
