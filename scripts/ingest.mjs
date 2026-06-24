import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { chunkMarkdown } from './lib/chunk.mjs'
import { embed } from '../api/_lib/gemini.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const KNOWLEDGE_DIR = join(__dirname, '..', 'knowledge')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// Embed with a few retries so a per-minute rate limit doesn't kill the run.
async function embedWithRetry(text, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      return await embed(text)
    } catch (e) {
      if (i === tries - 1 || !String(e.message).includes('429')) throw e
      console.log('  rate limited, waiting 6s…')
      await sleep(6000)
    }
  }
}

async function main() {
  const files = (await readdir(KNOWLEDGE_DIR)).filter((f) => f.endsWith('.md'))

  // Replace-all: clear stale rows so edits don't accumulate duplicates.
  const { error: delErr } = await supabase.from('documents').delete().neq('id', -1)
  if (delErr) throw delErr

  let total = 0
  for (const file of files) {
    const text = await readFile(join(KNOWLEDGE_DIR, file), 'utf8')
    const chunks = chunkMarkdown(text, file)
    for (const chunk of chunks) {
      const embedding = await embedWithRetry(chunk.content)
      const { error } = await supabase.from('documents').insert({
        content: chunk.content,
        embedding,
        metadata: chunk.metadata,
      })
      if (error) throw error
      total++
      await sleep(250)
    }
    console.log(`${file}: ${chunks.length} chunks`)
  }
  console.log(`Ingested ${total} chunks total.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
