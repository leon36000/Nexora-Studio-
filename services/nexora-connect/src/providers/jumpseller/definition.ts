import type { ProviderDefinition } from "../../core/types.ts";

import { jumpsellerActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "jumpseller",
  displayName: "Jumpseller",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Auth Token",
      placeholder: "JUMPSELLER_AUTH_TOKEN",
      description:
        "Jumpseller Auth Token used together with your API Login through HTTP Basic Authentication. Find both values in your Jumpseller admin account sidebar: https://jumpseller.com/support/api/",
      extraFields: [
        {
          key: "login",
          label: "API Login",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "JUMPSELLER_API_LOGIN",
          description:
            "Jumpseller API Login paired with the Auth Token for HTTP Basic Authentication. Find it in your Jumpseller admin account sidebar: https://jumpseller.com/support/api/",
        },
      ],
    },
  ],
  homepageUrl: "https://jumpseller.com",
  actions: jumpsellerActions,
};
