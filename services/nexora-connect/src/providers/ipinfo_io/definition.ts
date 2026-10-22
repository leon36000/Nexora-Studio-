import type { ProviderDefinition } from "../../core/types.ts";

import { ipinfoIoActions } from "./actions.ts";

const service = "ipinfo_io";

/**
 * IPinfo provider backed by the public Lite, legacy, and Lookup APIs.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "IPinfo",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "ipinfo_token",
      description:
        "IPinfo access token used to authenticate API requests. Get it from the IPinfo dashboard: https://ipinfo.io/dashboard/lite.",
    },
  ],
  homepageUrl: "https://ipinfo.io",
  actions: ipinfoIoActions,
};
