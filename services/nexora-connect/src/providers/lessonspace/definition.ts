import type { ProviderDefinition } from "../../core/types.ts";

import { lessonspaceActions } from "./actions.ts";

const service = "lessonspace";

/**
 * Lessonspace provider backed by the public Lessonspace API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Lessonspace",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "LESSONSPACE_API_KEY",
      description:
        "Lessonspace API key sent with the Authorization: Organisation <API_KEY> header. Generate it in your Lessonspace dashboard under Settings > Developer: https://helpdesk.thelessonspace.com/article/86-does-lessonspace-have-an-api",
      extraFields: [
        {
          key: "organisationId",
          label: "Organisation ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "org_123",
          description:
            "The Lessonspace organisation identifier used in organisation-scoped API paths. Use the organisation id from your Lessonspace environment when calling organisation session endpoints.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.thelessonspace.com",
  actions: lessonspaceActions,
};
