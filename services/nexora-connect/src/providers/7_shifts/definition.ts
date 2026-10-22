import type { ProviderDefinition } from "../../core/types.ts";

import { sevenShiftsActions } from "./actions.ts";

const service = "7_shifts";

export const provider: ProviderDefinition = {
  service,
  displayName: "7shifts",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "7SHIFTS_ACCESS_TOKEN",
      description:
        "7shifts long-lived access token sent with the Authorization: Bearer header. Create or view access tokens in Company Settings > Developer Tools, as described in the 7shifts authentication docs: https://developers.7shifts.com/reference/authentication.",
      extraFields: [
        {
          key: "companyGuid",
          label: "Company GUID",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "1310bfe1-cb3f-4f24-98a2-fde2bc504108",
          description:
            "Optional 7shifts company GUID sent as x-company-guid for OAuth-issued bearer tokens or accounts that require it.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.7shifts.com/",
  actions: sevenShiftsActions,
};
