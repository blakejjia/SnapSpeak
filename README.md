# Pic-Reader: Picture to Voice Web Application

Pic-Reader is a single-command Python application that allows users to upload a picture or take a snapshot using their webcam, extract phrases/sentences using Google Gemini (via LangChain), and generate a unified audio guide (MP3) in the target languages. It features a "跟读" (read-along) mode that automatically inserts structured silence intervals for learning purposes.

The frontend is served statically directly by the FastAPI backend, making this a pure Python project with zero Node.js/npm dependencies!

## Repository Layout

- **`main.py`**: Entrypoint for the FastAPI application.
- **`services/`**: LangChain and Audio Synthesis logic.
- **`static/`**: HTML/CSS/JS frontend assets served statically.
- **`AGENT.md`**: Developer and Agent architectural guidelines.

## Quick Start

### Prerequisites
- **Python 3.9+**
- **FFmpeg**: Required by `pydub` for audio stitching. Ensure `ffmpeg` is installed and added to your system's PATH.

### Setup & Run (Standard Python)
1. Create a virtual environment and activate it:
   ```bash
   python -m venv .venv
   
   # On Windows (PowerShell)
   .\.venv\Scripts\Activate.ps1
   # On Windows (Command Prompt)
   .venv\Scripts\activate
   # On macOS/Linux
   source .venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure environment variables in `.env` (copy from `.env.example` if not already present).
4. Run the application:
   ```bash
   python main.py
   ```
5. Access the application in your browser at `http://localhost:8000`.

### Setup & Run (Using uv)
If you are using **`uv`**, running is even easier:
1. Initialize the uv project (first time only):
   ```bash
   uv init --bare
   uv add -r requirements.txt
   ```
2. Run the application:
   ```bash
   uv run python main.py
   ```
3. Access the application in your browser at `http://localhost:8000`.
