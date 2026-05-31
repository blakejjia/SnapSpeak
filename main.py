import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables BEFORE importing service singletons
# so they can read GEMINI_API_KEY, EUDIC_API_TOKEN, etc. from .env
load_dotenv()

from services.langchain_service import langchain_service
from services.audio_service import audio_service
from services.frdic_service import frdic_service

app = FastAPI(title="SnapSpeak API")

# Configure CORS so frontend can communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files and index.html
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_index():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    raise HTTPException(status_code=404, detail="Index file not found")


class ProcessImageRequest(BaseModel):
    image: str = Field(description="Base64 encoded string of the image.")
    prompt: str = Field(default="Extract all vocabulary words and phrases from this image", description="Prompt instructing AI what to extract.")

class ProcessImageResponse(BaseModel):
    items: list = Field(description="List of extracted text items with languages.")

@app.post("/api/process-image", response_model=ProcessImageResponse)
async def process_image(request: ProcessImageRequest):
    try:
        # OCR / Text extraction using LangChain and Gemini
        extraction = await langchain_service.extract_text_from_image(
            base64_image=request.image,
            prompt=request.prompt
        )

        if not extraction.items:
            raise HTTPException(status_code=422, detail="No text items could be extracted from the image.")

        return ProcessImageResponse(
            items=[item.model_dump() for item in extraction.items]
        )

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")


class GenerateAudioRequest(BaseModel):
    items: list = Field(description="List of extracted text items with languages (each having text and language fields).")
    read_along: bool = Field(default=False, description="If True, adds extra silence gap for reading along.")
    voice_speed: float = Field(default=1.0, description="Speech rate/speed factor (e.g. 0.5 to 2.0).")

@app.post("/api/generate-audio")
async def generate_audio(request: GenerateAudioRequest):
    """Generate stitched MP3 audio and return it directly as bytes. No files stored on disk."""
    try:
        from services.langchain_service import ExtractedItem

        # Convert dict items to ExtractedItem objects
        items = [ExtractedItem(**item) for item in request.items]

        if not items:
            raise HTTPException(status_code=422, detail="No text items provided for audio generation.")

        audio_bytes = await audio_service.generate_stitched_audio(
            items=items,
            read_along=request.read_along,
            voice_speed=request.voice_speed
        )

        return Response(content=audio_bytes, media_type="audio/mpeg")

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate audio: {str(e)}")

# ── FRDic (法语助手/欧路词典) OpenAPI proxy endpoints ──


class FRDicTokenStatusResponse(BaseModel):
    has_token: bool = Field(description="Whether an FRDic API token is configured.")


class FRDicSetTokenRequest(BaseModel):
    token: str = Field(description="FRDic API token (starts with 'NIS ').")


class FRDicListBooksRequest(BaseModel):
    pass  # Always uses French (fr)


class FRDicCreateBookRequest(BaseModel):
    name: str = Field(description="Name of the new vocabulary book.")


class FRDicAddWordsRequest(BaseModel):
    category_id: str = Field(description="Target vocabulary book ID.")
    words: list[str] = Field(description="List of words to upload.")


@app.post("/api/frdic/token-status", response_model=FRDicTokenStatusResponse)
async def frdic_token_status():
    return FRDicTokenStatusResponse(has_token=frdic_service.has_token())


@app.post("/api/frdic/set-token")
async def frdic_set_token(request: FRDicSetTokenRequest):
    frdic_service.set_token(request.token)
    return {"message": "Token set successfully."}


@app.post("/api/frdic/list-books")
async def frdic_list_books(request: FRDicListBooksRequest):
    try:
        if not frdic_service.has_token():
            raise HTTPException(status_code=400, detail="FRDic API token is not configured. Set EUDIC_API_TOKEN in .env or enter it in the app.")
        return await frdic_service.list_books("fr")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"FRDic API error: {e.response.text}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"FRDic API unreachable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/frdic/create-book")
async def frdic_create_book(request: FRDicCreateBookRequest):
    try:
        if not frdic_service.has_token():
            raise HTTPException(status_code=400, detail="FRDic API token is not configured.")
        return await frdic_service.create_book("fr", request.name)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"FRDic API error: {e.response.text}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"FRDic API unreachable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/frdic/add-words")
async def frdic_add_words(request: FRDicAddWordsRequest):
    try:
        if not frdic_service.has_token():
            raise HTTPException(status_code=400, detail="FRDic API token is not configured.")
        return await frdic_service.add_words("fr", request.category_id, request.words)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"FRDic API error: {e.response.text}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"FRDic API unreachable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    # Use environment PORT or default to 8000
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    dev_mode = os.getenv("ENV", "production") == "development"
    uvicorn.run("main:app", host=host, port=port, reload=dev_mode)
