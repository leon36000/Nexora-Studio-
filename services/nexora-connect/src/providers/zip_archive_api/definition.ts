import type { ProviderDefinition } from "../../core/types.ts";

import { zipArchiveApiActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "zip_archive_api",
  displayName: "Zip Archive API",
  categories: ["Developer Tools", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Secret Key",
      placeholder: "ARCHIVEAPI_SECRET",
      description: "ArchiveAPI secret key appended to API requests. View it at https://archiveapi.com/account.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://archiveapi.com",
  actions: zipArchiveApiActions,
};
