import type { ProviderDefinition } from "../../core/types.ts";

import { formspreeActions } from "./actions.ts";

const service = "formspree";

/**
 * Formspree provider backed by the public Formspree Forms API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Formspree",
  categories: ["Developer Tools", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "FORMSPREE_API_KEY",
      description:
        "Formspree API key used with the Authorization: Bearer <api_key> header. Create or copy one from the Formspree form API keys page: https://help.formspree.io/articles/the-forms-api/api-keys/.",
      extraFields: [
        {
          key: "formId",
          label: "Form hashid",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "xabc123",
          description:
            "Formspree form hashid used to validate and read submissions. Find it in the form endpoint URL or follow Formspree's hashid guide: https://help.formspree.io/articles/the-forms-api/getting-your-form-s-hashid/.",
        },
      ],
    },
  ],
  homepageUrl: "https://formspree.io",
  actions: formspreeActions,
};
