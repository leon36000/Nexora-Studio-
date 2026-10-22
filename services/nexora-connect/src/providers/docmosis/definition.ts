import type { ProviderDefinition } from "../../core/types.ts";

import { docmosisActions } from "./actions.ts";

const service = "docmosis";

export const provider: ProviderDefinition = {
  service,
  displayName: "Docmosis",
  categories: ["Productivity", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Key",
      placeholder: "DOCMOSIS_ACCESS_KEY",
      description:
        "Docmosis environment access key used to authenticate Cloud API requests. Create or copy it from your environment API Keys page in the Cloud Console: https://resources.docmosis.com/content/faq/where-are-my-api-keys-and-base-urls-for-my-environments",
      extraFields: [
        {
          key: "apiBaseUrl",
          label: "API Base URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://us1.dws4.docmosis.com/api",
          description:
            "Docmosis processing-location base URL for the environment that holds your templates. Official US, Europe, and Australia examples are documented here: https://apidocs.docmosis.com/cloud/dws4/.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.docmosis.com",
  actions: docmosisActions,
};
