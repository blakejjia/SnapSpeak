# Pic-Reader: Picture to Voice Web Application

Pic-Reader is an application that allows users to upload a picture or take a snapshot using their webcam, extract phrases/sentences using Google Gemini (via LangChain), and generate a unified audio guide (MP3) in the target languages. It features a "跟读" (read-along) mode that automatically inserts structured silence intervals for learning purposes.

## Repository Layout

- **`frontend/`**: Next.js frontend application.
- **`backend/`**: Python FastAPI backend incorporating LangChain and Audio Synthesis logic.
- **`AGENT.md`**: Developer and Agent architectural guidelines.

## Quick Start

### Prerequisites
- **Python 3.9+**
- **Node.js 18+**
- **FFmpeg**: Required by `pydub` for audio stitching. Ensure `ffmpeg` is installed and added to your system's PATH.

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   # On Windows (Command Prompt)
   venv\Scripts\activate
   # On Windows (PowerShell)
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables in `.env` (copy from `.env.example`).
5. Run the backend:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Access the application in your browser at `http://localhost:3000`.
