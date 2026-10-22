import type { ProviderDefinition } from "../../core/types.ts";

import { myOtpAppActions } from "./actions.ts";
export const provider: ProviderDefinition = {
  service: "myotp_app",
  displayName: "MyOTP.App",
  categories: ["Security", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_MYOTP_APP_API_KEY",
      description: "MyOTP.App API key from https://myotp.app/dashboard/.",
    },
  ],
  homepageUrl: "https://myotp.app",
  actions: myOtpAppActions,
};
