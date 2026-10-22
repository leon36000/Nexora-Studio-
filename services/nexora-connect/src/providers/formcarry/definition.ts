import type { ProviderDefinition } from "../../core/types.ts";

import { formcarryActions } from "./actions.ts";

const service = "formcarry";

/**
 * Formcarry provider backed by the public Formcarry API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Formcarry",
  categories: ["Marketing", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "formcarry_api_key",
      description:
        "Formcarry API key passed with the api_key request header. Copy it from the Integrations page in your Formcarry dashboard: https://app.formcarry.com/integrations.",
    },
  ],
  homepageUrl: "https://formcarry.com",
  actions: formcarryActions,
};
