# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SnapSpeak is a **single-command Python web app** (no Node.js) that turns pictures of text into multilingual voice guides. It uses LangChain + Google Gemini for OCR/structured extraction, Microsoft Edge Neural TTS for voice synthesis, and pydub for audio stitching. The frontend is vanilla HTML/CSS/JS served statically by FastAPI.

## Commands

```bash
# Install dependencies and sync virtual environment
uv sync

# Run the server (development, with hot reload)
uv run python main.py

# The server binds to HOST:PORT from .env (default: 0.0.0.0:8000)
# Open http://localhost:8000 in a browser
```

**System dependency:** FFmpeg must be installed separately (`winget install Gyan.FFmpeg` on Windows, `brew install ffmpeg` on macOS, `sudo apt install ffmpeg` on Linux).

There are no tests, no linters, and no build step.

## Architecture

```
main.py                           # FastAPI entrypoint — defines routes, serves static/
├── POST /api/process-image       # Core endpoint: image → extracted items + stitched MP3
├── GET  /api/audio/{filename}    # Serve generated audio files from temp/
└── GET  /                        # Serves static/index.html
services/
├── langchain_service.py          # Gemini multimodal extraction via LangChain
│   └── ExtractedItem (text, language) / ExtractionResponse (items: list)
└── audio_service.py              # edge-tts synthesis + pydub stitching
    └── VOICE_MAPPING dict: 9 languages → neural voice names
static/
├── index.html                    # Single-page app (vanilla JS, ~500 lines inline script)
└── globals.css                   # Glassmorphism dark theme design system
temp/                             # Runtime generated audio files (gitignored)
```

**Data flow:** User uploads/captures image → base64 sent to `/api/process-image` with `prompt`, `read_along` (boolean), and `voice_speed` (float) → LangChain calls Gemini with a JSON schema to extract `{items: [{text, language}]}` → edge-tts synthesizes each item as an MP3 clip → pydub stitches clips with calculated silence gaps → combined MP3 saved to `temp/` → frontend receives `{items, audio_url}` and renders the audio deck + language cards.

**Read-along mode (`read_along: true`):** silence after each clip = clip duration + 1 second (for the student to repeat). Standard mode: fixed 1-second pause.

**Voice speed:** converted from float multiplier (0.5–2.0) to edge-tts rate format (`+25%`, `-15%`, etc.).

## Environment Variables

Create a `.env` file (gitignored) with:

```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash-lite-preview-02-05   # default if unset
PORT=8000
HOST=0.0.0.0
```

## Frontend State

The single-page app at `static/index.html` persists `prompt`, `read_along`, and `voice_speed` in `localStorage` (keys: `snapspeak_prompt`, `snapspeak_read_along`, `snapspeak_voice_speed`). All DOM manipulation is vanilla JS — no framework. The UI uses glassmorphism with CSS custom properties defined in `globals.css`.

## Package Management

This project uses **uv** exclusively. Dependencies are declared in `pyproject.toml` and locked in `uv.lock`. Use `uv sync` to install, `uv run` to execute scripts.
