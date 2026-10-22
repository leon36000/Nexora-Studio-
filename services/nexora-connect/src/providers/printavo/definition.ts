import type { ProviderDefinition } from "../../core/types.ts";

import { printavoActions } from "./actions.ts";

const service = "printavo";

export const provider: ProviderDefinition = {
  service,
  displayName: "Printavo",
  description: "Read Printavo account, contact, customer, task, quote, and invoice data.",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "PRINTAVO_API_TOKEN",
      description:
        "Printavo API token sent with the token request header. Generate or view it in My Account > API Token: https://support.printavo.com/hc/en-us/articles/46719343322651-API-Documentation",
      extraFields: [
        {
          key: "email",
          label: "Account Email",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "you@example.com",
          description:
            "The Printavo account email sent with the email request header. Use the email address for the Printavo user whose API token is used.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.printavo.com",
  actions: printavoActions,
};
