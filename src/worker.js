// Listening Audio Studio - Cloudflare Worker + KV Storage Engine
//
// Endpoints:
// GET    /api/tracks        - List all saved listening tracks
// GET    /api/tracks/:id    - Get track metadata & transcript
// GET    /api/audio/:id     - Stream WAV audio binary directly from KV
// POST   /api/tracks        - Save audio & metadata into KV
// DELETE /api/tracks/:id    - Delete track from KV
// POST   /api/tts           - Server-side Gemini 3.8 TTS generation & storage
// Everything else is served from public/ via env.ASSETS.

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, x-gemini-key',
  'access-control-max-age': '86400'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...CORS_HEADERS
    }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    const path = url.pathname;
    const method = request.method;

    try {
      // 1. GET /api/tracks - List all tracks
      if (path === '/api/tracks' && method === 'GET') {
        const rawIndex = await env.LISTENING_DATA.get('tracks_index');
        const tracks = rawIndex ? JSON.parse(rawIndex) : [];
        return json({ tracks });
      }

      // 2. GET /api/audio/:id - Stream binary audio file
      if (path.startsWith('/api/audio/') && method === 'GET') {
        const id = path.replace('/api/audio/', '').trim();
        if (!id) return json({ error: 'Missing track ID' }, 400);

        const audioBuffer = await env.LISTENING_DATA.get('audio:' + id, { type: 'arrayBuffer' });
        if (!audioBuffer) {
          return json({ error: 'Audio not found' }, 404);
        }

        const range = request.headers.get('range');
        const totalSize = audioBuffer.byteLength;

        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
          const chunk = audioBuffer.slice(start, end + 1);

          return new Response(chunk, {
            status: 206,
            headers: {
              'content-type': 'audio/wav',
              'content-range': `bytes ${start}-${end}/${totalSize}`,
              'accept-ranges': 'bytes',
              'content-length': String(chunk.byteLength),
              ...CORS_HEADERS
            }
          });
        }

        return new Response(audioBuffer, {
          status: 200,
          headers: {
            'content-type': 'audio/wav',
            'content-length': String(totalSize),
            'accept-ranges': 'bytes',
            'cache-control': 'public, max-age=604800, immutable',
            ...CORS_HEADERS
          }
        });
      }

      // 3. GET /api/tracks/:id - Get single track metadata
      if (path.startsWith('/api/tracks/') && method === 'GET') {
        const id = path.replace('/api/tracks/', '').trim();
        const raw = await env.LISTENING_DATA.get('track:' + id);
        if (!raw) return json({ error: 'Track not found' }, 404);
        return json(JSON.parse(raw));
      }

      // 4. POST /api/tracks - Save new track
      if (path === '/api/tracks' && method === 'POST') {
        const body = await request.json();
        const { id, title, subtitle, transcript, audioBase64, style } = body;

        if (!id || !title || !audioBase64) {
          return json({ error: 'id, title, and audioBase64 are required' }, 400);
        }

        // Decode Base64 to ArrayBuffer
        const binaryStr = atob(audioBase64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        // Save audio binary in KV
        await env.LISTENING_DATA.put('audio:' + id, bytes.buffer);

        const trackMeta = {
          id,
          title,
          subtitle: subtitle || '',
          style: style || '',
          transcript: transcript || [],
          createdAt: new Date().toISOString(),
          audioUrl: `/api/audio/${id}`
        };

        // Save metadata in KV
        await env.LISTENING_DATA.put('track:' + id, JSON.stringify(trackMeta));

        // Update tracks index
        const rawIndex = await env.LISTENING_DATA.get('tracks_index');
        let tracks = rawIndex ? JSON.parse(rawIndex) : [];
        tracks = tracks.filter(t => t.id !== id);
        tracks.unshift({
          id,
          title,
          subtitle: subtitle || '',
          createdAt: trackMeta.createdAt,
          audioUrl: trackMeta.audioUrl
        });

        // Limit index to latest 50 tracks
        if (tracks.length > 50) tracks = tracks.slice(0, 50);
        await env.LISTENING_DATA.put('tracks_index', JSON.stringify(tracks));

        return json({ success: true, track: trackMeta });
      }

      // 5. DELETE /api/tracks/:id - Delete track
      if (path.startsWith('/api/tracks/') && method === 'DELETE') {
        const id = path.replace('/api/tracks/', '').trim();
        await env.LISTENING_DATA.delete('track:' + id);
        await env.LISTENING_DATA.delete('audio:' + id);

        const rawIndex = await env.LISTENING_DATA.get('tracks_index');
        if (rawIndex) {
          let tracks = JSON.parse(rawIndex);
          tracks = tracks.filter(t => t.id !== id);
          await env.LISTENING_DATA.put('tracks_index', JSON.stringify(tracks));
        }

        return json({ success: true, deletedId: id });
      }

      // 6. POST /api/tts - Server-side Gemini 3.8 TTS proxy
      if (path === '/api/tts' && method === 'POST') {
        const apiKey = env.GEMINI_API_KEY || request.headers.get('x-gemini-key');
        if (!apiKey) {
          return json({ error: 'Missing Gemini API key on server. Set GEMINI_API_KEY secret or pass x-gemini-key header.' }, 401);
        }

        const payload = await request.json();
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          return json({ error: `Gemini API error: ${errText}` }, geminiRes.status);
        }

        const data = await geminiRes.json();
        return json(data);
      }

      return json({ error: 'Endpoint not found' }, 404);

    } catch (err) {
      return json({ error: err.message || 'Server error' }, 500);
    }
  }
};
