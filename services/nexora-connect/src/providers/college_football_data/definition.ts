import type { ProviderDefinition } from "../../core/types.ts";

import { collegeFootballDataActions } from "./actions.ts";

const service = "college_football_data";

/**
 * CollegeFootballData provider backed by the public CollegeFootballData API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "CollegeFootballData",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "COLLEGE_FOOTBALL_DATA_API_KEY",
      description:
        "CollegeFootballData API key sent as a Bearer token. Get a free key from the official key page: https://collegefootballdata.com/key",
    },
  ],
  homepageUrl: "https://collegefootballdata.com/",
  actions: collegeFootballDataActions,
};
