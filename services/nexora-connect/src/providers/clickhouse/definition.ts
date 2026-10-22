import type { ProviderDefinition } from "../../core/types.ts";

import { clickhouseActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "clickhouse",
  displayName: "ClickHouse",
  categories: ["Data", "Developer Tools"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "password",
          label: "Password",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "Enter password",
          description:
            "The password for the ClickHouse database user. For ClickHouse Cloud, use the service password shown when the service user is created or reset.",
        },
        {
          key: "username",
          label: "Username",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "default",
          description:
            "The ClickHouse database user used for HTTP Basic authentication. The default ClickHouse user is usually named default.",
        },
        {
          key: "baseUrl",
          label: "Base URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://your-cluster.clickhouse.cloud:8443",
          description:
            "The HTTP endpoint for your ClickHouse instance, such as https://host:8443 or http://localhost:8123. See the ClickHouse HTTP interface docs: https://clickhouse.com/docs/interfaces/http.",
        },
        {
          key: "defaultDatabase",
          label: "Default Database Name",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "default",
          description:
            "Optional default database used by query execution and table schema lookup when an action input does not specify a database.",
        },
      ],
      testAction: {
        actionName: "execute_query",
        input: {
          query: "SELECT 1 AS ok",
        },
      },
    },
  ],
  homepageUrl: "https://clickhouse.com",
  actions: clickhouseActions,
};
