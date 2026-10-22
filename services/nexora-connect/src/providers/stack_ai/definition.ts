import type { ProviderDefinition } from "../../core/types.ts";

import { stackAiActions } from "./actions.ts";

const service = "stack_ai";

export const provider: ProviderDefinition = {
  service,
  displayName: "StackAI",
  categories: ["AI", "Developer Tools"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "apiKey",
          label: "Public API Key",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "STACK_AI_PUBLIC_KEY",
          description:
            "StackAI public API key used with the Authorization: Bearer <apiKey> header for deployed flow inference requests.",
        },
        {
          key: "organizationId",
          label: "Organization ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "org_...",
          description: "The StackAI organization identifier used in deployed flow paths.",
        },
        {
          key: "flowId",
          label: "Flow ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "flow_...",
          description: "The deployed StackAI flow identifier used in inference requests.",
        },
      ],
      testAction: {
        actionName: "get_run_metadata",
        input: { runId: "validation" },
      },
    },
  ],
  homepageUrl: "https://www.stack-ai.com",
  actions: stackAiActions,
};
