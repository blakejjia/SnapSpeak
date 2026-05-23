# Agent Guidelines & Project Architecture (AGENT.md)

Welcome to the **SnapSpeak** project! This file serves as the system manual and guide for human developers and AI coding agents. It describes the design philosophy, architectural components, execution flows, and implementation instructions for building and extending the project.

---

## 1. Project Overview

**SnapSpeak** is a picture-to-voice web application structured as a monorepo:
- **Frontend**: A Node.js web application (Next.js) that provides a user-friendly UI to upload pictures or capture images using a camera. It sends the image, user prompts, and "跟读" (read-along) settings to the backend, receives the generated MP3, plays it, and allows downloading it. Settings are persisted in the browser's `localStorage`.
- **Backend**: A Python application using LangChain, Google Gemini (`gemini-2.0-flash-lite`), and Microsoft Neural TTS (`edge-tts`) to parse the image, extract a structured list of sentences/words and their corresponding languages, convert them to natural voice clips, and stitch them into a single audio file with customizable timing intervals.

---

## 2. Directory Structure

```
snapspeak/
├── frontend/                 # Next.js Frontend Application
│   ├── package.json          # Node dependencies (next, react, react-dom, etc.)
│   ├── next.config.js        # Next.js configuration and proxy rewrite rules
│   ├── public/               # Public assets
│   └── src/
│       └── app/              # Next.js App Router routes and components
│           ├── layout.js     # Shell and global configuration
│           ├── page.js       # Main client-side user interface
│           └── globals.css   # Custom CSS theme (glassmorphism)
│
├── backend/                  # Python LangChain Backend
│   ├── requirements.txt      # Python dependencies (fastapi, langchain, edge-tts, pydub, audioop-lts)
│   ├── main.py               # FastAPI server & route handlers
│   ├── .env.example          # Environment variables template
│   ├── services/
│   │   ├── __init__.py
│   │   ├── langchain_service.py # LangChain structured extraction
│   │   └── audio_service.py     # TTS generation and audio stitching
│   └── temp/                 # Folder for temporary audio files
│
├── nixpacks.toml             # Nixpacks configuration (installs ffmpeg)
├── AGENT.md                  # This manual
├── README.md                 # User instructions (setup, usage, running)
└── .gitignore                # Git ignore files
```

---

## 3. Workflow & Technical Specification

### A. Frontend to Backend Payload
The frontend sends a `POST` request to the backend with:
- `image`: Base64 encoded string of the uploaded/captured image.
- `prompt`: String indicating what words or sentences to extract (e.g. "Extract all English words and translation", "Extract all French dialog sentences").
- `read_along`: Boolean indicating if "跟读" (read-along / repeat-after-me) mode is active.

Settings (`prompt` and `read_along`) are saved in the client browser's `localStorage` so they do not need to be re-entered.

### B. Backend Stage 1: AI structured text extraction
The backend uses LangChain with Gemini (Multimodal model) to extract a structured list.
Expected JSON Schema for the extraction:
```json
{
  "items": [
    {
      "text": "The sentence/word to be spoken",
      "language": "en" 
    }
  ]
}
```
*Note:* The `language` field must be a valid BCP 47 language code supported by the mapping to Microsoft edge-tts voices (e.g. `en`, `zh`, `ja`, `ko`, `fr`, `es`, `de`, `ru`, `it`).

### C. Backend Stage 2: Audio Synthesis & Stitching
1. For each item in the extracted list:
   - Map the language to a high-quality neural voice (e.g., `en-US-EmmaNeural` for English, `zh-CN-XiaoxiaoNeural` for Chinese, `ja-JP-NanamiNeural` for Japanese).
   - Call the `edge-tts` generator to synthesize a temporary MP3 file.
   - Load the audio clip using `pydub`.
   - Calculate the required silence interval following the clip:
     - **If `read_along` is true**: Interval = (Duration of current clip) + 1.0 second.
     - **If `read_along` is false**: Interval = 1.0 second.
2. Concatenate all audio clips and their corresponding silences into a single audio segment.
3. Export the combined segment as a master MP3.
4. Clean up temporary audio files.
5. Return the master MP3 relative retrieval path (`/api/audio/{filename}`) to the frontend.
6. The frontend renders a custom glassmorphic audio deck that includes play controls, playback timeline, and a download button to download the stitched audio file.

---

## 4. UI/UX Design Guidelines

To deliver a premium feel, the frontend interface must follow these styles:
- **Aesthetics**: Dark mode by default, utilizing glassmorphism (translucent panels, soft backdrops, blurs).
- **Color Palette**: Rich HSL tailormade colors (e.g., deep purples, slates, and neon accents). Avoid default primary colors.
- **Typography**: Modern fonts (e.g., *Inter* or *Outfit* loaded from Google Fonts).
- **Transitions**: Smooth animations for camera activation, image loading, and list generation.

---

## 5. Development Tasks & Milestones

For any developer/agent implementing this system, follow these steps:
1. **Initialize Backend**: 
   - Set up Python virtual environment.
   - Install dependencies in `backend/requirements.txt` (FastAPI, Uvicorn, LangChain, Pydub, gTTS).
   - Write API schema and routing.
2. **Implement LangChain Service**:
   - Integrate `langchain-google-genai` (or alternative).
   - Define Pydantic schema for output parsing.
3. **Implement Audio Service**:
   - Write gTTS generation.
   - Implement stitching algorithm using `pydub.AudioSegment`.
4. **Initialize Frontend**:
   - Scaffold Next.js App Router project.
   - Configure proxy rewrite rules in next.config.js to direct /api requests to port 8000.
5. **Implement Frontend UI**:
   - Write camera capture and image upload handlers.
   - Style layout with premium glassmorphism.
6. **E2E Validation**:
   - Test full flow: upload image -> get audio -> play back.
