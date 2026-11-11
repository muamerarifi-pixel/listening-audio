# Listening Audio Studio (Gemini TTS)

A fast, distraction-free listening audio site designed specifically for language learning and listening practice. Powered by Google Gemini 3.8 TTS.

## Features

- **Distraction-Free Listening Player:** No visual clutter during listening sessions. Focus entirely on comprehension.
- **Teacher & Student Audio Controls:**
  - `⏪ -5s` and `+5s ⏩` instant jump buttons (crucial for ESL listening exercises).
  - Quick speed toggle (`0.8×` ESL learner mode, `1.0×` normal, `1.2×` advanced).
  - Continuous loop toggle for repetitive drills.
  - One-click WAV audio download.
  - Real-time animated audio visualizer.
- **Multiple Input Modes:**
  - **Script / Dialogue Mode:** Supports single speaker, 2 speakers, or 3+ speakers formatted as `Speaker: Line`.
  - **AI Prompt-to-Script:** Type a topic or level prompt (e.g. *"Grade 2 lunchbox dialogue with Mia and Leo"*), and Gemini drafts the script for you.
  - **Book Photo / OCR:** Drag & drop a photo of a textbook page or exercise, and Gemini Vision extracts dialogue lines automatically.
- **Gemini 3.8 TTS Engine:**
  - Integrates `gemini-3.8-flash-tts` and `gemini-3.8-flash-lite-tts`.
  - Distinct voice assignments: `Puck` (warm male), `Aoede` (breezy female), `Kore` (gentle female), `Fenrir` (deep male), `Charon` (authoritative narrator).
  - Custom delivery style prompts (e.g. *"Clear enunciation for Cambridge Grade 2 learners"*).
- **Keyboard Shortcuts:**
  - <kbd>Space</kbd>: Play / Pause
  - <kbd>←</kbd> / <kbd>→</kbd>: Jump ±5 seconds
  - <kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd>: Set speed to 0.8×, 1.0×, or 1.2×
  - <kbd>N</kbd>: Open New Audio generation drawer
  - <kbd>Esc</kbd>: Close drawer

## Quick Start

### Option 1: Native Node.js Server (Recommended)
```powershell
cd C:\Users\Asus\.gemini\antigravity\scratch\listening-audio
node server.js
```
Then open `http://127.0.0.1:3000` in your browser.

### Option 2: Direct File Open
You can also open `index.html` directly in Edge or Chrome.
