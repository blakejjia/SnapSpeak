# Pic-Reader: Picture to Voice Web Application

Pic-Reader is a single-command Python application that allows users to upload a picture or take a snapshot using their webcam, extract phrases/sentences using Google Gemini (via LangChain), and generate a unified audio guide (MP3) in the target languages. It features a "跟读" (read-along) mode that automatically inserts structured silence intervals for learning purposes.

The frontend is served statically directly by the FastAPI backend, making this a pure Python project with zero Node.js/npm dependencies!

## Repository Layout

- **`backend/`**: Python FastAPI backend incorporating LangChain and Audio Synthesis logic.
  - **`backend/static/`**: HTML/CSS/JS frontend assets served statically.
- **`AGENT.md`**: Developer and Agent architectural guidelines.

## Quick Start

### Prerequisites
- **Python 3.9+**
- **FFmpeg**: Required by `pydub` for audio stitching. Ensure `ffmpeg` is installed and added to your system's PATH.

### Setup & Run
1. Navigate to the backend folder, create a virtual environment, and activate it:
   ```bash
   cd backend
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
3. Configure environment variables in `backend/.env` (copy from `backend/.env.example` if not already present).
4. Run the application from the repository root:
   ```bash
   python -m backend.main
   ```
5. Access the application in your browser at `http://localhost:8000`.
