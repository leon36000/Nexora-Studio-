// Notion API docs: https://developers.notion.com/reference/intro
// Internal integration guide: https://developers.notion.com/guides/get-started/internal-integrations

import { adminHeaders, fetchJson, runtimeHeaders } from "./client.ts";

const token = process.env.NOTION_TOKEN;
if (!token) {
  console.log("Set NOTION_TOKEN to run this example.");
  process.exit(0);
}

await fetchJson("http://localhost:3000/api/connections/notion", {
  method: "PUT",
  headers: adminHeaders({ "content-type": "application/json" }),
  body: JSON.stringify({ authType: "api_key", values: { apiKey: token } }),
});

const result = await fetchJson("http://localhost:3000/v1/actions/notion.search", {
  method: "POST",
  headers: runtimeHeaders({ "content-type": "application/json" }),
  body: JSON.stringify({ input: { page_size: 5 } }),
});

console.log(JSON.stringify(result, null, 2));
