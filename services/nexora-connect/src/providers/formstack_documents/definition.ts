import type { ProviderDefinition } from "../../core/types.ts";

import { formstackDocumentsActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "formstack_documents",
  displayName: "Formstack Documents",
  categories: ["Productivity", "Developer Tools"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "apiKey",
          label: "API Key",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "FORMSTACK_DOCUMENTS_API_KEY",
          description:
            "API Key used as the HTTP Basic username. Open profile menu > API Access: https://www.webmerge.me/developers/authentication",
        },
        {
          key: "apiSecret",
          label: "API Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "FORMSTACK_DOCUMENTS_API_SECRET",
          description:
            "API Secret used as the HTTP Basic password. Open profile menu > API Access: https://www.webmerge.me/developers/authentication",
        },
      ],
    },
  ],
  homepageUrl: "https://forms.formstack.com/products/documents",
  actions: formstackDocumentsActions,
};
