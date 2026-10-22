import type { ProviderDefinition } from "../../core/types.ts";

import { recruiterflowActions } from "./actions.ts";

const service = "recruiterflow";

export const provider: ProviderDefinition = {
  service,
  displayName: "Recruiterflow",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "RECRUITERFLOW_API_KEY",
      description:
        "Recruiterflow API key sent with the RF-Api-Key header. Request a workspace API key from Recruiterflow support through in-app chat or help@recruiterflow.com; see the official API setup article: https://help.recruiterflow.com/en/articles/3671870-build-a-custom-careers-page-with-the-recruiterflow-api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://recruiterflow.com",
  actions: recruiterflowActions,
};
