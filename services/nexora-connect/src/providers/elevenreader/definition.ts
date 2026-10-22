import type { ProviderDefinition } from "../../core/types.ts";

import { elevenreaderActions } from "./actions.ts";

const service = "elevenreader";

export const provider: ProviderDefinition = {
  service,
  displayName: "ElevenReader",
  categories: ["AI", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "xi-api-key",
      description:
        "ElevenLabs API key sent with the xi-api-key header for ElevenReader actions. Create or manage keys from Developers > API Keys.",
    },
  ],
  homepageUrl: "https://elevenlabs.io/text-reader",
  actions: elevenreaderActions,
};
