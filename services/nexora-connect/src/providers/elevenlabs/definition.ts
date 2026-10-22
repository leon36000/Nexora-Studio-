import type { ProviderDefinition } from "../../core/types.ts";

import { elevenlabsActions } from "./actions.ts";

const service = "elevenlabs";

export const provider: ProviderDefinition = {
  service,
  displayName: "ElevenLabs",
  categories: ["AI", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "xi-api-key",
      description:
        "ElevenLabs API key sent with the xi-api-key header. Create or manage keys from Developers > API Keys.",
    },
  ],
  homepageUrl: "https://elevenlabs.io",
  actions: elevenlabsActions,
};
