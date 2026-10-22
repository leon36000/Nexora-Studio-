import type { ProviderDefinition } from "../../core/types.ts";

import { mongoDbAtlasAdministrationActions } from "./actions.ts";

const service = "mongo_db_atlas_administration";

export const provider: ProviderDefinition = {
  service,
  displayName: "MongoDB Atlas Administration",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Public API Key",
      placeholder: "MONGODB_ATLAS_PUBLIC_KEY",
      description:
        "MongoDB Atlas public API key used as the Digest username. Create or view API keys in Atlas under Organization Access Manager > API Keys: https://www.mongodb.com/docs/atlas/configure-api-access/.",
      extraFields: [
        {
          key: "privateKey",
          label: "Private API Key",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "MONGODB_ATLAS_PRIVATE_KEY",
          description:
            "MongoDB Atlas private API key paired with the public API key for HTTP Digest authentication. Atlas shows the private key only when the API key is created: https://www.mongodb.com/docs/atlas/configure-api-access/.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.mongodb.com/products/platform/atlas-database",
  actions: mongoDbAtlasAdministrationActions,
};
