// Appelle Nexora avec le client « openai » officiel (Node 18+), en flux.
//   npm install openai
//   NEXORA_BASE_URL=https://ia.pme.fr/v1 NEXORA_API_KEY=sk-nexora-... npx tsx chat.ts "agent:Assistant général"
import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: process.env.NEXORA_BASE_URL,
  apiKey: process.env.NEXORA_API_KEY,
})

async function stream(model: string, question: string) {
  console.log(`--- ${model}`)
  const chunks = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: question }],
    stream: true,
  })
  for await (const chunk of chunks) process.stdout.write(chunk.choices[0]?.delta?.content ?? '')
  console.log()
}

try {
  await stream('nexora-default', 'Bonjour ! Présente-toi en une phrase.')
  const agent = process.argv[2]
  if (agent) await stream(agent, 'Bonjour ! À quoi sers-tu, en une phrase ?')
} catch (error) {
  if (error instanceof OpenAI.APIError) {
    console.error(`Refus ${error.status} : ${error.message}`)
    process.exit(1)
  }
  throw error
}
