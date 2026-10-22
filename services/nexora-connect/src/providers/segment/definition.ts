import type { ProviderDefinition } from "../../core/types.ts";

import { segmentActions } from "./actions.ts";

const service = "segment";

export const provider: ProviderDefinition = {
  service,
  displayName: "Segment",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Write Key",
      placeholder: "SEGMENT_WRITE_KEY",
      description:
        "Segment source write key sent as the writeKey JSON body field. Open the Segment app, select a source, then copy its write key from the source settings: https://segment.com/docs/connections/find-writekey/.",
    },
  ],
  homepageUrl: "https://segment.com",
  actions: segmentActions,
};
