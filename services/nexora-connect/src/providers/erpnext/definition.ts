import type { ProviderDefinition } from "../../core/types.ts";

import { erpnextActions } from "./actions.ts";

const service = "erpnext";

export const provider: ProviderDefinition = {
  service,
  displayName: "ERPNext",
  categories: ["Productivity", "Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "api_key",
      description:
        "ERPNext API key used with token authentication. Generate it from the user record's API Access section as described in the Frappe REST API docs: https://docs.frappe.io/framework/user/en/api/rest",
      extraFields: [
        {
          key: "baseUrl",
          label: "Base URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://demo.erpnext.com",
          description: "Base URL of your ERPNext or Frappe instance.",
        },
        {
          key: "apiSecret",
          label: "API Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "api_secret",
          description:
            "ERPNext API secret paired with the API key for token authentication. Frappe shows it in the Generate Keys popup in the user record's API Access section: https://docs.frappe.io/framework/user/en/api/rest",
        },
      ],
    },
  ],
  homepageUrl: "https://erpnext.com",
  actions: erpnextActions,
};
