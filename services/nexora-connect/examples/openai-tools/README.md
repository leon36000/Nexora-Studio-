# OpenAI Tools Example

These examples convert the local action catalog into OpenAI function tools.

Start the local runtime:

```bash
npm run dev
```

If the server requires bearer tokens, set `OOMOL_CONNECT_ADMIN_TOKEN` when listing `/api` actions.
Set `OOMOL_CONNECT_RUNTIME_TOKEN` when running action calls through `/v1`.

Print the tool definitions sent to the OpenAI Responses API:

```bash
node examples/openai-tools/list-tools.ts
```

Run a Hacker News tool call loop through the OpenAI Responses API:

```bash
OPENAI_API_KEY=sk-... OPENAI_MODEL=gpt-... node examples/openai-tools/run-hackernews.ts
```
