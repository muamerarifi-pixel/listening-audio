# Listening Audio Studio (Gemini 3.8 TTS, Vision & Cloudflare KV)

A fast, distraction-free listening audio site designed specifically for Cambridge English & ESL teachers and learners. Powered by Google Gemini 3.8 (TTS & Multimodal Vision) and Cloudflare Workers KV storage.

**Live Site:** [https://listening-audio.muamer-arifi.workers.dev](https://listening-audio.muamer-arifi.workers.dev)  
**GitHub Repo:** [https://github.com/muamerarifi-pixel/listening-audio](https://github.com/muamerarifi-pixel/listening-audio)

---

## What Makes This Special for Teachers

1. **Missing Audio File Problem Solved:**
   - When an exercise in your textbook requires audio but you don't have the CD or track file, simply **take or upload a photo of the exercise page**.
   - Gemini Vision inspects the exercise (questions, gaps, food items, characters, instructions).
   - Gemini automatically scripts a natural listening dialogue that contains the exact clues required to solve the exercise.
   - Synthesizes the audio using `gemini-3.8-flash-tts` with native-speaker voices and natural ESL pacing.

2. **Automated Teacher's Answer Keys:**
   - Generates the complete **Answer Key** for every question, blank, or matching item on the uploaded page.
   - Shows the question, the **bold correct answer**, and the **verbatim clue** from the audio dialogue.
   - Includes pedagogical Teacher Notes (pre-teaching tips, suggested pauses).
   - One-click **Copy Answer Key** to paste into lesson plans or Classboard.

3. **Textbook Page Lightbox Viewer:**
   - Keep the textbook page handy while the audio is playing. Click **"View Page"** (<kbd>P</kbd>) to pop up the exercise picture for classroom projection.

4. **Distraction-Free Audio Player:**
   - Zero visual clutter during active listening tests or classroom sessions.
   - **-5s / +5s Instant Jump Buttons:** Crucial for repeating a specific sentence for students.
   - **Speed Selector:** `0.8×` (slow & clear for primary ESL), `1.0×` (natural), `1.2×` (advanced).
   - Loop / repeat toggle & direct WAV download.
   - Collapsible transcript peek with color-coded speaker badges.

5. **Cloudflare KV Persistent Audio & Image Storage:**
   - Automatically saves generated listening tracks, transcripts, answer keys, and page images to Cloudflare KV (`LISTENING_DATA`).
   - Saved Tracks Library drawer (<kbd>L</kbd>) to access tracks across all your devices (phone, laptop, classroom interactive board).
   - Efficient binary audio streaming with HTTP byte-range request support.

---

## Keyboard Shortcuts

- <kbd>Space</kbd>: Play / Pause
- <kbd>←</kbd> / <kbd>→</kbd>: Jump ±5 seconds
- <kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd>: Set speed to 0.8×, 1.0×, or 1.2×
- <kbd>K</kbd>: Toggle Teacher's Answer Key
- <kbd>T</kbd>: Toggle Dialogue Transcript
- <kbd>P</kbd>: View Textbook Page Picture
- <kbd>N</kbd>: Open New Audio generation drawer
- <kbd>L</kbd>: Open Saved Tracks Library
- <kbd>Esc</kbd>: Close drawer / modal

---

## Deploying & Development

```bash
# Test locally
node server.js

# Deploy to Cloudflare Workers
npx wrangler deploy
```
