/**
 * Reads at most `maxBytes` of a response body and cancels the rest, so a log or output file of
 * any size costs bounded memory. `truncated` says whether more was there.
 */
export async function readBoundedBody(
  body: ReadableStream<Uint8Array>,
  maxBytes: number
): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  let truncated = false
  try {
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) break
      const room = maxBytes - length
      if (chunk.value.byteLength > room) {
        chunks.push(chunk.value.subarray(0, room))
        length += room
        truncated = true
        break
      }
      chunks.push(chunk.value)
      length += chunk.value.byteLength
    }
  } finally {
    if (truncated) await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { bytes, truncated }
}
