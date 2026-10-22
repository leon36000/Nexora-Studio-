import type { ProviderDefinition } from "../../core/types.ts";

import { htmlcsstoimageActions } from "./actions.ts";

const service = "htmlcsstoimage";

/**
 * HTML/CSS to Image provider backed by the HCTI API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "HTML/CSS to Image",
  categories: ["Developer Tools", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "APIKey",
      description: "HTML/CSS to Image API Key used as the HTTP Basic password.",
      extraFields: [
        {
          key: "userId",
          label: "User ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "UserID",
          description: "HTML/CSS to Image User ID used as the HTTP Basic username.",
        },
      ],
    },
  ],
  homepageUrl: "https://htmlcsstoimage.com",
  actions: htmlcsstoimageActions,
};
