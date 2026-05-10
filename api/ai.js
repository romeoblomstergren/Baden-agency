import Anthropic from '@anthropic-ai/sdk'

export const config = { api: { bodyParser: true } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages, system, max_tokens = 1500 } = req.body ?? {}
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens,
      system,
      messages,
    })
    const content = response.content?.map(b => b.text ?? '').join('') ?? ''
    return res.status(200).json({ content })
  } catch (err) {
    console.error('AI error:', err)
    return res.status(500).json({ error: err.message ?? 'Internal server error' })
  }
}
