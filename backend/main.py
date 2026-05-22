import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from backend.services.langchain_service import langchain_service, ExtractionResponse
from backend.services.audio_service import audio_service

app = FastAPI(title="Pic-Reader API")

# Configure CORS so frontend can communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProcessImageRequest(BaseModel):
    image: str = Field(description="Base64 encoded string of the image.")
    prompt: str = Field(default="Extract all vocabulary words and phrases from this image", description="Prompt instructing AI what to extract.")
    read_along: bool = Field(default=False, description="If True, adds extra silence gap for reading along.")

class ProcessImageResponse(BaseModel):
    items: list = Field(description="List of extracted text items with languages.")
    audio_url: str = Field(description="Relative API URL to retrieve the stitched audio file.")

@app.post("/api/process-image", response_model=ProcessImageResponse)
async def process_image(request: ProcessImageRequest):
    try:
        # 1. OCR / Text extraction using LangChain and Gemini
        extraction = await langchain_service.extract_text_from_image(
            base64_image=request.image,
            prompt=request.prompt
        )
        
        if not extraction.items:
            raise HTTPException(status_code=422, detail="No text items could be extracted from the image.")
            
        # 2. TTS and stitching
        audio_filepath = await audio_service.generate_stitched_audio(
            items=extraction.items,
            read_along=request.read_along
        )
        
        # 3. Formulate retrieval URL
        filename = os.path.basename(audio_filepath)
        audio_url = f"/api/audio/{filename}"
        
        return ProcessImageResponse(
            items=[item.model_dump() for item in extraction.items],
            audio_url=audio_url
        )
        
    except ValueError as ve:
        # Catch API key config issues or bad values
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")

@app.get("/api/audio/{filename}")
def get_audio(filename: str):
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp")
    filepath = os.path.join(temp_dir, filename)
    
    # Path traversal security check
    real_path = os.path.realpath(filepath)
    real_temp_dir = os.path.realpath(temp_dir)
    if not real_path.startswith(real_temp_dir):
        raise HTTPException(status_code=403, detail="Access denied")
        
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Audio file not found")
        
    return FileResponse(filepath, media_type="audio/mpeg", filename=filename)

if __name__ == "__main__":
    import uvicorn
    # Use environment PORT or default to 8000
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
