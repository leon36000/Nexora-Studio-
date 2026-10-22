import type { ProviderDefinition } from "../../core/types.ts";

import { imgbbActions } from "./actions.ts";

const service = "imgbb";

/**
 * ImgBB provider backed by the public ImgBB image upload API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "ImgBB",
  categories: ["Design & Media", "Storage"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "imgbb_api_key",
      description:
        "ImgBB API key sent as the key query parameter on the upload endpoint. Get or view it on the official API page: https://api.imgbb.com/.",
    },
  ],
  homepageUrl: "https://imgbb.com",
  actions: imgbbActions,
};
