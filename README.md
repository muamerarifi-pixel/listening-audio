# Listening Audio Studio (Gemini 3.8 TTS & Cloudflare KV)

A fast, distraction-free listening audio site designed specifically for language learning, ESL classes, and listening practice. Powered by Google Gemini 3.8 TTS and Cloudflare Workers KV storage.

**Live Site:** [https://listening-audio.muamer-arifi.workers.dev](https://listening-audio.muamer-arifi.workers.dev)  
**GitHub Repo:** [https://github.com/muamerarifi-pixel/listening-audio](https://github.com/muamerarifi-pixel/listening-audio)

---

## Features

- **Distraction-Free Listening Player (Zero Visual Clutter):**
  - Clean waveform canvas visualization with real-time responsive animation.
  - Large focal playback controls with keyboard navigation.
  - **-5s / +5s Instant Jump Buttons:** Crucial for classroom listening drills and student repetition.
  - **Speed Selector:** `0.8×` (slow & clear for primary ESL learners), `1.0×` (natural), `1.2×` (advanced).
  - Loop / repeat toggle & direct WAV download.
  - Collapsible transcript peek with color-coded speaker badges.

- **Cloudflare KV Persistent Audio Storage:**
  - Automatically saves generated listening tracks to Cloudflare KV (`LISTENING_DATA`).
  - Saved Tracks Library drawer to browse, replay, or delete past tracks.
  - Efficient binary audio streaming with HTTP byte-range request support.

- **Flexible Input Modes (Gemini 3.8):**
  - **Script / Dialogue Mode:** Supports single speaker, 2 speakers, or 3+ speakers (`Speaker: Line`).
  - **AI Prompt-to-Script:** Type a topic or level prompt, and Gemini drafts an age-appropriate dialogue.
  - **Book Photo / OCR:** Drag & drop a photo of a textbook page, and Gemini extracts dialogue lines automatically.
  - **Voice Customization:** Assign distinct Gemini voices (`Puck`, `Aoede`, `Kore`, `Fenrir`, `Charon`) with custom delivery style prompts.

- **Keyboard Shortcuts:**
  - <kbd>Space</kbd>: Play / Pause
  - <kbd>←</kbd> / <kbd>→</kbd>: Jump ±5 seconds
  - <kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd>: Set speed to 0.8×, 1.0×, or 1.2×
  - <kbd>N</kbd>: Open New Audio generation drawer
  - <kbd>L</kbd>: Open Saved Tracks Library
  - <kbd>Esc</kbd>: Close drawer / modal

---

## Deploying

This project is deployed directly with Wrangler:

```bash
# Install dependencies
npm install

# Test locally with Wrangler
npx wrangler dev

# Deploy to Cloudflare Workers
npx wrangler deploy
```

### Cloudflare Bindings

- **Static Assets:** Serves `public/` (cached at the edge).
- **KV Namespace:** `LISTENING_DATA` (`7049800c549243ff9652235169b1649b`)
  - `tracks_index`: JSON array of latest track metadata.
  - `track:<id>`: Metadata and full transcript for track `<id>`.
  - `audio:<id>`: Raw binary WAV audio buffer.

---

## Local Development (Zero Dependencies)

You can also run the bundled native Node.js server:

```powershell
node server.js
```
Then open `http://127.0.0.1:3000`.
