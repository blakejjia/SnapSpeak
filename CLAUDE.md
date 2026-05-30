# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LinguaSnap is a **single-command Python web app** (no Node.js) that turns pictures of text into multilingual voice guides and vocabulary book entries. It uses LangChain + Google Gemini for OCR/structured extraction, Microsoft Edge Neural TTS for voice synthesis, pydub for audio stitching, and the FRDic OpenAPI for vocabulary book uploads. The frontend is vanilla HTML/CSS/JS served statically by FastAPI.

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
├── POST /api/frdic/token-status   # Check if FRDic API token is configured
├── POST /api/frdic/set-token      # Set FRDic API token at runtime
├── POST /api/frdic/list-books     # List FRDic vocabulary books for a language
├── POST /api/frdic/create-book    # Create a new FRDic vocabulary book
├── POST /api/frdic/add-words      # Bulk-add words to an FRDic vocabulary book
├── GET  /api/audio/{filename}    # Serve generated audio files from temp/
└── GET  /                        # Serves static/index.html
services/
├── langchain_service.py          # Gemini multimodal extraction via LangChain
│   └── ExtractedItem (text, language) / ExtractionResponse (items: list)
├── audio_service.py              # edge-tts synthesis + pydub stitching
│   └── VOICE_MAPPING dict: 9 languages → neural voice names
└── frdic_service.py              # FRDic OpenAPI proxy (法语助手/欧路词典)
    └── FRDicService: list_books, create_book, add_words, set_token
static/
├── index.html                    # Single-page app (vanilla JS, ~500 lines inline script)
└── globals.css                   # Glassmorphism dark theme design system
temp/                             # Runtime generated audio files (gitignored)
```

**Data flow:** User uploads/captures image → base64 sent to `/api/process-image` with `prompt`, `read_along` (boolean), and `voice_speed` (float) → LangChain calls Gemini with a JSON schema to extract `{items: [{text, language}]}` → edge-tts synthesizes each item as an MP3 clip → pydub stitches clips with calculated silence gaps → combined MP3 saved to `temp/` → frontend receives `{items, audio_url}` and transitions from welcome view to dashboard.

**Dashboard:** Navigation rail (Voice Recording | Add to FRDic) switches main content panel. Word panel (right sidebar) persists across nav switches. "New Photo" returns to welcome view. "AI Re-analysis" re-processes the stored image with a new prompt.

**FRDic flow:** User selects target language → picks or creates a vocabulary book → selects words via quick-select chips (e.g. "All FR", "All EN") → uploads to FRDic API through backend proxy. API token is read from `EUDIC_API_TOKEN` env var or entered inline.

**Read-along mode (`read_along: true`):** silence after each clip = clip duration + 1 second (for the student to repeat). Standard mode: fixed 1-second pause.

**Voice speed:** converted from float multiplier (0.5–2.0) to edge-tts rate format (`+25%`, `-15%`, etc.).

## Environment Variables

Create a `.env` file (gitignored) with:

```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash-lite-preview-02-05   # default if unset
EUDIC_API_TOKEN=your_frdic_token_here               # optional, can be entered in-app
PORT=8000
HOST=0.0.0.0
```

## Frontend State

The single-page app at `static/index.html` uses a global `state` object managing: `extractionResult` (the core AI result — null until an image is processed), `currentView` ('welcome' | 'dashboard'), `activePanel` ('voice' | 'frdic'), and FRDic-specific state (`selectedLanguage`, `selectedBookId`, `selectedWords` Set). Settings persist in `localStorage` under `linguasnap_*` keys (with migration from old `snapspeak_*` keys). All DOM manipulation is vanilla JS — no framework. The UI uses glassmorphism with CSS custom properties defined in `globals.css`.

## Package Management

This project uses **uv** exclusively. Dependencies are declared in `pyproject.toml` and locked in `uv.lock`. Use `uv sync` to install, `uv run` to execute scripts.
