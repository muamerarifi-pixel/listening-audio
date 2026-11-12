// Listening Audio Studio - Cloudflare Worker + KV Storage Engine
//
// Endpoints:
// GET    /api/tracks        - List all saved listening tracks
// GET    /api/tracks/:id    - Get track metadata, transcript & answer key
// GET    /api/audio/:id     - Stream WAV audio binary directly from KV
// GET    /api/image/:id     - Stream textbook exercise image directly from KV
// POST   /api/tracks        - Save audio, image, transcript & answer key into KV
// DELETE /api/tracks/:id    - Delete track, audio & image from KV
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

      // 3. GET /api/image/:id - Stream textbook exercise image
      if (path.startsWith('/api/image/') && method === 'GET') {
        const id = path.replace('/api/image/', '').trim();
        if (!id) return json({ error: 'Missing image ID' }, 400);

        const imageBuffer = await env.LISTENING_DATA.get('image:' + id, { type: 'arrayBuffer' });
        if (!imageBuffer) {
          return json({ error: 'Image not found' }, 404);
        }

        return new Response(imageBuffer, {
          status: 200,
          headers: {
            'content-type': 'image/jpeg',
            'content-length': String(imageBuffer.byteLength),
            'cache-control': 'public, max-age=604800, immutable',
            ...CORS_HEADERS
          }
        });
      }

      // 4. GET /api/tracks/:id - Get single track metadata, transcript & answer key
      if (path.startsWith('/api/tracks/') && method === 'GET') {
        const id = path.replace('/api/tracks/', '').trim();
        const raw = await env.LISTENING_DATA.get('track:' + id);
        if (!raw) return json({ error: 'Track not found' }, 404);
        return json(JSON.parse(raw));
      }

      // 5. POST /api/tracks - Save new track with audio, image & answer key
      if (path === '/api/tracks' && method === 'POST') {
        const body = await request.json();
        const {
          id,
          title,
          subtitle,
          transcript,
          audioBase64,
          style,
          answerKey,
          teacherNotes,
          imageBase64,
          exerciseSummary
        } = body;

        if (!id || !title || !audioBase64) {
          return json({ error: 'id, title, and audioBase64 are required' }, 400);
        }

        // Decode Audio Base64 to ArrayBuffer
        const binaryAudioStr = atob(audioBase64);
        const audioLen = binaryAudioStr.length;
        const audioBytes = new Uint8Array(audioLen);
        for (let i = 0; i < audioLen; i++) {
          audioBytes[i] = binaryAudioStr.charCodeAt(i);
        }

        // Save audio binary in KV
        await env.LISTENING_DATA.put('audio:' + id, audioBytes.buffer);

        // Optionally save image binary if provided
        let imageUrl = null;
        if (imageBase64) {
          try {
            const rawBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            const binaryImgStr = atob(rawBase64);
            const imgLen = binaryImgStr.length;
            const imgBytes = new Uint8Array(imgLen);
            for (let i = 0; i < imgLen; i++) {
              imgBytes[i] = binaryImgStr.charCodeAt(i);
            }
            await env.LISTENING_DATA.put('image:' + id, imgBytes.buffer);
            imageUrl = `/api/image/${id}`;
          } catch (e) {
            console.warn('Could not save image to KV:', e);
          }
        }

        const trackMeta = {
          id,
          title,
          subtitle: subtitle || '',
          style: style || '',
          exerciseSummary: exerciseSummary || '',
          transcript: transcript || [],
          answerKey: Array.isArray(answerKey) ? answerKey : [],
          teacherNotes: teacherNotes || '',
          imageUrl,
          hasImage: !!imageUrl,
          hasAnswerKey: Array.isArray(answerKey) && answerKey.length > 0,
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
          audioUrl: trackMeta.audioUrl,
          hasImage: trackMeta.hasImage,
          hasAnswerKey: trackMeta.hasAnswerKey,
          imageUrl: trackMeta.imageUrl
        });

        // Limit index to latest 50 tracks
        if (tracks.length > 50) tracks = tracks.slice(0, 50);
        await env.LISTENING_DATA.put('tracks_index', JSON.stringify(tracks));

        return json({ success: true, track: trackMeta });
      }

      // 6. DELETE /api/tracks/:id - Delete track, audio & image
      if (path.startsWith('/api/tracks/') && method === 'DELETE') {
        const id = path.replace('/api/tracks/', '').trim();
        await env.LISTENING_DATA.delete('track:' + id);
        await env.LISTENING_DATA.delete('audio:' + id);
        await env.LISTENING_DATA.delete('image:' + id);

        const rawIndex = await env.LISTENING_DATA.get('tracks_index');
        if (rawIndex) {
          let tracks = JSON.parse(rawIndex);
          tracks = tracks.filter(t => t.id !== id);
          await env.LISTENING_DATA.put('tracks_index', JSON.stringify(tracks));
        }

        return json({ success: true, deletedId: id });
      }

      // 7. POST /api/tts - Server-side Gemini 3.8 / 3.1 TTS proxy
      if (path === '/api/tts' && method === 'POST') {
        const body = await request.json();
        const apiKey = body.apiKey || env.GEMINI_API_KEY || request.headers.get('x-gemini-key');
        if (!apiKey) {
          return json({ error: 'Missing Gemini API key on server. Set GEMINI_API_KEY secret or pass x-gemini-key header.' }, 401);
        }
        delete body.apiKey;

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        const data = await geminiRes.json();
        return json(data, geminiRes.status);
      }

      // 8. POST /api/generate - Server-side Gemini Vision & Text drafting proxy
      if (path === '/api/generate' && method === 'POST') {
        const body = await request.json();
        const apiKey = body.apiKey || env.GEMINI_API_KEY || request.headers.get('x-gemini-key');
        if (!apiKey) {
          return json({ error: 'Missing Gemini API key on server. Set GEMINI_API_KEY secret or pass x-gemini-key header.' }, 401);
        }
        delete body.apiKey;

        const model = body.model || 'gemini-2.5-flash';
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body.payload || body)
        });

        const data = await geminiRes.json();
        return json(data, geminiRes.status);
      }

      // 9. POST /api/elevenlabs/tts - Server-side ElevenLabs TTS proxy
      if (path === '/api/elevenlabs/tts' && method === 'POST') {
        const body = await request.json();
        const apiKey = body.apiKey || env.ELEVENLABS_API_KEY || request.headers.get('xi-api-key');
        if (!apiKey) {
          return json({ error: 'Missing ElevenLabs API key. Please enter your ElevenLabs API key in Settings.' }, 401);
        }

        const voiceId = body.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel
        const text = body.text || '';
        const modelId = body.modelId || 'eleven_multilingual_v2';

        const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
            'Accept': 'audio/mpeg'
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          })
        });

        if (!elevenRes.ok) {
          const errData = await elevenRes.json().catch(() => ({}));
          return json({ error: errData.detail?.message || `ElevenLabs error (${elevenRes.status})` }, elevenRes.status);
        }

        const audioBuffer = await elevenRes.arrayBuffer();
        const bytes = new Uint8Array(audioBuffer);
        let binaryStr = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binaryStr += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binaryStr);

        return json({
          success: true,
          audioBase64: base64,
          mimeType: 'audio/mpeg'
        });
      }

      // 10. GET /api/config - Public configuration status
      if (path === '/api/config' && method === 'GET') {
        return json({
          hasServerKey: !!env.GEMINI_API_KEY,
          hasElevenLabsKey: !!env.ELEVENLABS_API_KEY,
          hasKv: !!env.LISTENING_DATA
        });
      }

      return json({ error: 'Endpoint not found' }, 404);

    } catch (err) {
      return json({ error: err.message || 'Server error' }, 500);
    }
  }
};
