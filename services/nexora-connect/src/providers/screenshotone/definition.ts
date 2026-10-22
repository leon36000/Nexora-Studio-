import type { ProviderDefinition } from "../../core/types.ts";

import { screenshotoneActions } from "./actions.ts";

const service = "screenshotone";

export const provider: ProviderDefinition = {
  service,
  displayName: "ScreenshotOne",
  categories: ["Developer Tools", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Key",
      placeholder: "access_key_xxx",
      description:
        "ScreenshotOne access key used to authenticate API requests. Get it from https://dash.screenshotone.com/access.",
    },
  ],
  homepageUrl: "https://screenshotone.com",
  actions: screenshotoneActions,
};
