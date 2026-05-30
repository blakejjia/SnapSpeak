import os
import base64
import io
import re
from typing import List
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from PIL import Image

# Register HEIC/HEIF support with Pillow (for Apple Live Photos / phone camera formats)
try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except (ImportError, AttributeError):
    pass  # pillow-heif not installed; HEIC files will fall through to Gemini native support

class ExtractedItem(BaseModel):
    text: str = Field(description="The extracted word, phrase, or sentence from the image.")
    language: str = Field(description="The BCP 47/ISO 639-1 language code (e.g. 'en', 'zh', 'ja', 'fr', 'es') for Text-to-Speech synthesis.")

class ExtractionResponse(BaseModel):
    items: List[ExtractedItem] = Field(description="List of extracted text items with their specified languages.")

class LangChainService:
    def __init__(self):
        # Read the model from environment variables, default to gemini-2.0-flash-lite-preview-02-05
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")

    def _normalize_image(self, base64_image: str) -> tuple[str, str]:
        """
        Normalize the incoming base64 image to JPEG for Gemini.

        Returns (base64_data, mime_type) where mime_type is e.g. 'image/jpeg'.

        Handles phone camera formats like HEIC/HEIF (Apple Live Photos),
        WebP, GIF, BMP, and others by converting to JPEG via Pillow.
        JPEG and PNG pass through if already small enough.
        """
        # Strip data URL prefix if present, and detect the original MIME type
        mime_type = "image/jpeg"  # default
        raw_b64 = base64_image

        match = re.match(r'data:([\w/+-]+);base64,(.+)', base64_image)
        if match:
            mime_type = match.group(1)
            raw_b64 = match.group(2)

        # Decode the base64 data
        try:
            image_bytes = base64.b64decode(raw_b64)
        except Exception:
            raise ValueError("Invalid base64-encoded image data.")

        # Determine if conversion is needed — JPEG and PNG are fine as-is;
        # HEIC/HEIF/WebP/GIF/BMP/TIFF/etc. get converted to JPEG
        SAFE_MIMES = {"image/jpeg", "image/jpg", "image/png"}
        if mime_type in SAFE_MIMES:
            return raw_b64, mime_type

        # Convert to JPEG via Pillow (with pillow-heif registered for HEIC support)
        try:
            img = Image.open(io.BytesIO(image_bytes))
            # Convert RGBA/P modes to RGB for JPEG compatibility
            if img.mode in ("RGBA", "P", "LA"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                background.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
                img = background
            elif img.mode != "RGB":
                img = img.convert("RGB")

            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=90)
            converted_b64 = base64.b64encode(buf.getvalue()).decode("ascii")
            return converted_b64, "image/jpeg"
        except Exception:
            # If Pillow can't open it, pass through as-is and let Gemini try
            return raw_b64, mime_type

    async def extract_text_from_image(self, base64_image: str, prompt: str) -> ExtractionResponse:
        """
        Sends the base64-encoded image and user prompt to Gemini to extract a structured list of sentences/words.
        """
        # Ensure API key is configured
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set in the environment variables.")

        # Initialize the LangChain Google GenAI client
        llm = ChatGoogleGenerativeAI(
            model=self.model_name,
            google_api_key=api_key,
            temperature=0.0
        )

        # Structure the LLM output to match our Pydantic schema
        structured_llm = llm.with_structured_output(ExtractionResponse)

        # Prepare the multimodal prompt
        system_instruction = (
            "You are an expert OCR and language translation assistant. Analyze the provided image "
            "and extract words, sentences, or phrases according to the user's specific request/prompt. "
            "For each item, identify its spoken language and provide the appropriate BCP 47 or ISO-639-1 language code. "
            "Ensure the output conforms exactly to the requested schema."
        )

        # Normalize image to JPEG (handles HEIC/HEIF from phones, WebP, GIF, etc.)
        normalized_b64, mime_type = self._normalize_image(base64_image)

        message_content = [
            {
                "type": "text",
                "text": f"Instruction: {system_instruction}\n\nUser request: {prompt}"
            },
            {
                "type": "image_url",
                "image_url": f"data:{mime_type};base64,{normalized_b64}"
            }
        ]

        # Call the model
        message = HumanMessage(content=message_content)
        response = await structured_llm.ainvoke([message])
        return response
        
# Singleton instance
langchain_service = LangChainService()
