import type { ProviderDefinition } from "../../core/types.ts";

import { dockerHubActions } from "./actions.ts";

const service = "docker_hub";

/**
 * Docker Hub provider backed by the public Hub API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Docker Hub",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Credential",
      placeholder: "username:dckr_pat_xxx or organization:dckr_oat_xxx",
      description:
        "Enter identifier:secret so the runtime can exchange it for a Docker Hub bearer token. Use your Docker username with a password or personal access token, or an organization name with an organization access token.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://hub.docker.com",
  actions: dockerHubActions,
};
