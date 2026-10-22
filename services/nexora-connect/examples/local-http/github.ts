// GitHub REST API docs: https://docs.github.com/en/rest

import { adminHeaders, fetchJson, runtimeHeaders } from "./client.ts";

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.log("Set GITHUB_TOKEN to run this example.");
  process.exit(0);
}

await fetchJson("http://localhost:3000/api/connections/github", {
  method: "PUT",
  headers: adminHeaders({ "content-type": "application/json" }),
  body: JSON.stringify({ authType: "api_key", values: { apiKey: token } }),
});

const result = await fetchJson("http://localhost:3000/v1/actions/github.get_current_user", {
  method: "POST",
  headers: runtimeHeaders({ "content-type": "application/json" }),
  body: JSON.stringify({ input: {} }),
});

console.log(JSON.stringify(result, null, 2));
