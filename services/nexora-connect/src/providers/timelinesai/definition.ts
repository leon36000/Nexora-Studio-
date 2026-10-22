import type { ProviderDefinition } from "../../core/types.ts";

import { timelinesAiActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "timelinesai",
  displayName: "TimelinesAI",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Public API Token",
      placeholder: "TIMELINESAI_API_TOKEN",
      description: "Create a Public API token in TimelinesAI under Integrations > Public API and paste it here.",
    },
  ],
  homepageUrl: "https://timelines.ai/",
  actions: timelinesAiActions,
};
