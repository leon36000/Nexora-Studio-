import type { ProviderDefinition } from "../../core/types.ts";

import { platerecognizerActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "platerecognizer",
  displayName: "Plate Recognizer",
  categories: ["AI", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "PLATE_RECOGNIZER_API_TOKEN",
      description:
        "Plate Recognizer Snapshot Cloud API token used with the Authorization: Token header. Get it from the Snapshot Cloud dashboard: https://app.platerecognizer.com/service/snapshot-cloud/",
    },
  ],
  homepageUrl: "https://platerecognizer.com",
  actions: platerecognizerActions,
};
