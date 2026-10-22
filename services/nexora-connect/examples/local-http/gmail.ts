// Gmail API docs: https://developers.google.com/gmail/api/reference/rest
// Google OAuth redirect URI for this local runtime: http://localhost:3000/oauth/callback

import { adminHeaders, fetchJson } from "./client.ts";

const clientId = process.env.GMAIL_CLIENT_ID;
const clientSecret = process.env.GMAIL_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.log("Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to run this example.");
  process.exit(0);
}

await fetchJson("http://localhost:3000/api/oauth/configs/gmail", {
  method: "PUT",
  headers: adminHeaders({ "content-type": "application/json" }),
  body: JSON.stringify({ clientId, clientSecret }),
});

const started = await fetchJson<{ authorizationUrl?: string }>("http://localhost:3000/api/oauth/authorizations", {
  method: "POST",
  headers: adminHeaders({ "content-type": "application/json" }),
  body: JSON.stringify({ service: "gmail" }),
});

console.log("Open this URL in a browser, finish consent, then call Gmail actions:");
console.log(started.authorizationUrl);
