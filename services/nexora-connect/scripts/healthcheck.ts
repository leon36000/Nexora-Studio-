const port = process.env.PORT ?? "3000";
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS ?? 2500);
const url = `http://127.0.0.1:${port}/health`;

try {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    process.exit(1);
  }
} catch {
  process.exit(1);
}
