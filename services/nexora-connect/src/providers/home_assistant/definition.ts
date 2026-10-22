import type { ProviderDefinition } from "../../core/types.ts";

import { homeAssistantActions } from "./actions.ts";

const service = "home_assistant";

/**
 * Home Assistant provider backed by a user-configured Home Assistant instance.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Home Assistant",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Long-Lived Access Token",
      placeholder: "HOME_ASSISTANT_TOKEN",
      description:
        "Home Assistant long-lived access token used with the Authorization: Bearer header. Create it from your Home Assistant user profile page.",
      extraFields: [
        {
          key: "baseUrl",
          label: "Instance Base URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "http://homeassistant.local:8123",
          description:
            "The root URL for your Home Assistant instance, for example http://homeassistant.local:8123 or https://ha.example.com.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.home-assistant.io",
  actions: homeAssistantActions,
};
