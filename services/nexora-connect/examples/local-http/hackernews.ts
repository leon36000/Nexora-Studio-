// Hacker News API docs: https://github.com/HackerNews/API

import { fetchJson, runtimeHeaders } from "./client.ts";

const result = await fetchJson("http://localhost:3000/v1/actions/hackernews.get_top_stories", {
  method: "POST",
  headers: runtimeHeaders({ "content-type": "application/json" }),
  body: JSON.stringify({ input: {} }),
});

console.log(JSON.stringify(result, null, 2));
