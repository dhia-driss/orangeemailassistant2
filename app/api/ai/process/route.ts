import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { prompt, emailContent, attachments } = body as {
      prompt: string
      emailContent?: string
      attachments?: Array<{ filename?: string; data?: string }>
    }

    if (!prompt && !emailContent) {
      return NextResponse.json({ error: 'Missing prompt or emailContent' }, { status: 400 })
    }

    // Construct payload for Ollama. Ollama's multimodal chat accepts a model and messages.
    // We include the user's prompt + email content as a single message, and pass attachments in a top-level `images` array.
    const messages: any[] = [
      {
        role: 'user',
        content: `${prompt || ''}\n\n${emailContent || ''}`.trim(),
      },
    ]

    const payload: any = {
      model: 'llama3.2-vision:latest',
      messages,
      // ask Ollama to stream the response; many Ollama setups stream chunked text
      stream: true,
    }

    // If attachments were provided, forward them under `images` so clients that expect multimodal input can use them.
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      // attachments are expected to be objects with a `data` property containing a data URL or base64 string
      payload.images = attachments.map((a) => ({ data: a.data, filename: a.filename }))
    }

    const ollamaRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!ollamaRes.ok) {
      const text = await ollamaRes.text().catch(() => '')
      return NextResponse.json({ error: 'Ollama error', status: ollamaRes.status, details: text }, { status: 502 })
    }

    // Attempt to parse Ollama's streaming NDJSON-like output and forward only the assistant text pieces
    const contentType = ollamaRes.headers.get('content-type') || 'application/octet-stream'

    // If the response is likely JSON-lines or chunked JSON, parse it and forward the message.content pieces as text
    try {
      const reader = ollamaRes.body?.getReader()
      if (!reader) {
        // No readable stream, fallback to raw body
        return new NextResponse(ollamaRes.body, {
          headers: { 'Content-Type': contentType, 'Cache-Control': 'no-transform' },
        })
      }

      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()
      const decoder = new TextDecoder()

      ;(async () => {
        let buffer = ''
        try {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            if (!value) continue
            buffer += decoder.decode(value, { stream: true })

            // Split lines - Ollama often emits many small JSON objects per line
            const lines = buffer.split(/\r?\n/)
            // Keep last partial line in buffer
            buffer = lines.pop() || ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed) continue
              // Try parse each line as JSON; if it fails just forward the raw line
              try {
                const parsed = JSON.parse(trimmed)
                // The pasted example uses: { model, created_at, message: { role, content }, done }
                const content = parsed?.message?.content ?? parsed?.text ?? parsed?.data ?? null
                if (content) {
                  // Write the content as plain text chunk
                  await writer.write(new TextEncoder().encode(String(content)))
                }
              } catch (e) {
                // Not JSON - forward raw line
                try {
                  await writer.write(new TextEncoder().encode(trimmed + '\n'))
                } catch {}
              }
            }
          }

          // Flush any remaining buffer as a last attempt
          if (buffer.trim()) {
            try {
              const maybe = buffer.trim()
              try {
                const parsed = JSON.parse(maybe)
                const content = parsed?.message?.content ?? parsed?.text ?? parsed?.data ?? null
                if (content) await writer.write(new TextEncoder().encode(String(content)))
              } catch {
                await writer.write(new TextEncoder().encode(maybe))
              }
            } catch {}
          }
        } catch (streamErr) {
          // If anything fails mid-stream, attempt to write an error marker
          try {
            await writer.write(new TextEncoder().encode('\n[stream error]\n'))
          } catch {}
        } finally {
          try {
            await writer.close()
          } catch {}
        }
      })()

      return new NextResponse(readable, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-transform' },
      })
    } catch (parseErr) {
      // Fallback: return raw body
      return new NextResponse(ollamaRes.body, {
        headers: { 'Content-Type': contentType, 'Cache-Control': 'no-transform' },
      })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
