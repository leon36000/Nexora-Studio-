import type { ProviderDefinition } from "../../core/types.ts";

import { pivotalTrackerActions } from "./actions.ts";

const service = "pivotal_tracker";

export const provider: ProviderDefinition = {
  service,
  displayName: "Pivotal Tracker",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "pivotal_tracker_api_token",
      description:
        "Pivotal Tracker API token sent with the X-TrackerToken header. View or copy it from your Tracker profile page under API Token: https://www.pivotaltracker.com/profile",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.pivotaltracker.com",
  actions: pivotalTrackerActions,
};
