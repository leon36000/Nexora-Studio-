import type { ProviderDefinition } from "../../core/types.ts";

import { adafruitIoActions } from "./actions.ts";

const service = "adafruit_io";

export const provider: ProviderDefinition = {
  service,
  displayName: "Adafruit IO",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Adafruit IO Key",
      placeholder: "ADAFRUIT_IO_KEY",
      description:
        "Adafruit IO API key sent in the X-AIO-Key header. View or regenerate it from your Adafruit IO account page: https://io.adafruit.com/.",
    },
  ],
  homepageUrl: "https://io.adafruit.com/",
  actions: adafruitIoActions,
};
