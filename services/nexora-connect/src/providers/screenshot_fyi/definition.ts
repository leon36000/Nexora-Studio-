import type { ProviderDefinition } from "../../core/types.ts";

import { screenshotFyiActions } from "./actions.ts";

const service = "screenshot_fyi";

export const provider: ProviderDefinition = {
  service,
  displayName: "screenshot.fyi",
  categories: ["Developer Tools", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Key",
      placeholder: "YOUR_API_KEY",
      description:
        "screenshot.fyi access key appended as the accessKey query parameter. Create an account at https://www.screenshot.fyi/register, then copy your key from the screenshot.fyi dashboard.",
    },
  ],
  homepageUrl: "https://www.screenshot.fyi",
  actions: screenshotFyiActions,
};
