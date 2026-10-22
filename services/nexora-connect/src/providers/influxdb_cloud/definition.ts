import type { ProviderDefinition } from "../../core/types.ts";

import { influxdbCloudActions } from "./actions.ts";
import { influxdbCloudAllowedApiBaseUrls } from "./regions.ts";

const service = "influxdb_cloud";

export const provider: ProviderDefinition = {
  service,
  displayName: "InfluxDB Cloud",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "INFLUX_TOKEN",
      description:
        "InfluxDB Cloud API token sent with the Token authorization scheme. Create it from Load Data > API Tokens in the InfluxDB UI: https://docs.influxdata.com/influxdb3/cloud-serverless/admin/tokens/create-token/",
      extraFields: [
        {
          key: "apiBaseUrl",
          label: "API Base URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: influxdbCloudAllowedApiBaseUrls[0],
          description:
            "Official API URL for your InfluxDB Cloud Serverless region: https://docs.influxdata.com/influxdb3/cloud-serverless/reference/regions/",
        },
      ],
    },
  ],
  homepageUrl: "https://www.influxdata.com/products/influxdb-cloud/",
  actions: influxdbCloudActions,
};
