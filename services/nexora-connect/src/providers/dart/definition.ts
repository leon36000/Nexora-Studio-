import type { ProviderDefinition } from "../../core/types.ts";

import { dartActions } from "./actions.ts";

const service = "dart";

export const provider: ProviderDefinition = {
  service,
  displayName: "Dart",
  categories: ["Productivity", "AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Authorization Token",
      placeholder: "dsa_...",
      description:
        "Dart authorization token sent as a Bearer token. Copy it from Dart Settings > Account: https://app.dartai.com/?settings=account.",
    },
  ],
  homepageUrl: "https://www.dartai.com",
  actions: dartActions,
};
