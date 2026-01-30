export async function onRequest({ request, env }) {
  const url = new URL(request.url);

  if (url.pathname !== "/tts-merge") {
    return new Response("Not found", { status: 404 });
  }

  const text = url.searchParams.get("text");
  if (!text) {
    return new Response("Missing text", { status: 400 });
  }

  const voice = url.searchParams.get("voice") || "";
  const lang = url.searchParams.get("lang") || "";

  // Split text into 200-char chunks
  const chunks = [];
  for (let i = 0; i < text.length; i += 200) {
    chunks.push(text.slice(i, i + 200));
  }

  const buffers = [];

  for (const chunk of chunks) {
    let ttsUrl = `https://text.pollinations.ai/${encodeURIComponent(chunk)}?`;
    if (voice) ttsUrl += `voice=${encodeURIComponent(voice)}&`;
    if (lang) ttsUrl += `lang=${encodeURIComponent(lang)}&`;

    const headers = {};
    if (env.POLLINATIONS_API_KEY) {
      headers["Authorization"] = `Bearer ${env.POLLINATIONS_API_KEY}`;
    }

    const res = await fetch(ttsUrl, { headers });
    const buf = await res.arrayBuffer();
    buffers.push(buf);
  }

  // Merge MP3 buffers
  const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const merged = new Uint8Array(totalLength);

  let offset = 0;
  for (const buf of buffers) {
    merged.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  return new Response(merged, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": "inline; filename=voice.mp3",
      "Cache-Control": "no-store"
    }
  });
}
