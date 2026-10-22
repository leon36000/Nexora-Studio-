import type { ProviderDefinition } from "../../core/types.ts";

import { stackOverflowForTeamsActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "stack_overflow_for_teams",
  displayName: "Stack Internal",
  categories: ["Productivity", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "STACK_INTERNAL_PAT",
      description:
        "Stack Internal personal access token sent with the Authorization Bearer header. Create one from Account Settings > Personal access tokens: https://api.stackoverflowteams.com/docs/authentication",
      extraFields: [
        {
          key: "team",
          label: "Team Slug",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "my-team",
          description:
            "The team slug from your Stack Internal URL, such as my-team in stackoverflowteams.com/c/my-team.",
        },
      ],
    },
  ],
  homepageUrl: "https://stackoverflow.co/internal/",
  actions: stackOverflowForTeamsActions,
};
