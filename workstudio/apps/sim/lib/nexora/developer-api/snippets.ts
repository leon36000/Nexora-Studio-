/** Languages the « Code » button and the Développeurs page show. */
export const SNIPPET_LANGUAGES = ['python', 'typescript', 'curl', 'n8n'] as const
export type SnippetLanguage = (typeof SNIPPET_LANGUAGES)[number]

/** The developer API's base URL for an instance address: `<instance>/v1`. */
export function developerBaseUrl(appUrl: string): string {
  return `${appUrl.replace(/\/+$/, '')}/v1`
}

interface SnippetOptions {
  baseUrl: string
  /** A model name (`nexora-default`) or a published agent (`agent:<name>`). */
  model: string
  /** The message sent; a short French greeting by default. */
  message?: string
  /** System instructions, for a model (an agent keeps its own). */
  instructions?: string
}

const DEFAULT_MESSAGE = 'Bonjour ! Présente-toi en une phrase.'

/** A string literal both Python and TypeScript read: JSON's double-quoted form. */
function literal(value: string): string {
  return JSON.stringify(value)
}

/** Wraps text for a POSIX shell's single quotes (`'` becomes `'\''`). */
function shellQuote(value: string): string {
  return `'${value.replaceAll(`'`, `'\\''`)}'`
}

function messages(options: SnippetOptions) {
  return [
    ...(options.instructions ? [{ role: 'system', content: options.instructions }] : []),
    { role: 'user', content: options.message ?? DEFAULT_MESSAGE },
  ]
}

function pythonMessages(options: SnippetOptions): string {
  return messages(options)
    .map(
      (message) =>
        `        {"role": ${literal(message.role)}, "content": ${literal(message.content)}},`
    )
    .join('\n')
}

function typescriptMessages(options: SnippetOptions): string {
  return messages(options)
    .map(
      (message) => `    { role: ${literal(message.role)}, content: ${literal(message.content)} },`
    )
    .join('\n')
}

/**
 * A ready-to-copy example calling `model` through the developer API, with the official `openai`
 * clients (Python, TypeScript), cURL, or n8n's OpenAI credential. The key is never in the code:
 * it is read from `NEXORA_API_KEY`.
 */
export function buildSnippet(language: SnippetLanguage, options: SnippetOptions): string {
  switch (language) {
    case 'python':
      return `# pip install openai
import os

from openai import OpenAI

client = OpenAI(
    base_url=${literal(options.baseUrl)},
    api_key=os.environ["NEXORA_API_KEY"],  # clé de Réglages › Clés API
)

stream = client.chat.completions.create(
    model=${literal(options.model)},
    messages=[
${pythonMessages(options)}
    ],
    stream=True,
)
for chunk in stream:
    if chunk.choices:
        print(chunk.choices[0].delta.content or "", end="", flush=True)
print()
`
    case 'typescript':
      return `// npm install openai
import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: ${literal(options.baseUrl)},
  apiKey: process.env.NEXORA_API_KEY, // clé de Réglages › Clés API
})

const stream = await client.chat.completions.create({
  model: ${literal(options.model)},
  messages: [
${typescriptMessages(options)}
  ],
  stream: true,
})
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? '')
}
`
    case 'curl':
      return `curl ${options.baseUrl}/chat/completions \\
  -H "Authorization: Bearer $NEXORA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d ${shellQuote(JSON.stringify({ model: options.model, messages: messages(options) }))}
`
    case 'n8n':
      return `# n8n : Identifiants › Ajouter › « OpenAI »
#   API Key  : votre clé (variable NEXORA_API_KEY, Réglages › Clés API)
#   Base URL : ${options.baseUrl}
# Puis un nœud « OpenAI Chat Model » (ou « OpenAI › Message a Model »)
# avec cet identifiant, en « By ID » :
#   Model    : ${options.model}
`
  }
}
