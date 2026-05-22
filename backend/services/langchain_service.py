import os
import base64
from typing import List
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

class ExtractedItem(BaseModel):
    text: str = Field(description="The extracted word, phrase, or sentence from the image.")
    language: str = Field(description="The BCP 47/ISO 639-1 language code (e.g. 'en', 'zh', 'ja', 'fr', 'es') for Text-to-Speech synthesis.")

class ExtractionResponse(BaseModel):
    items: List[ExtractedItem] = Field(description="List of extracted text items with their specified languages.")

class LangChainService:
    def __init__(self):
        # Read the model from environment variables, default to gemini-2.0-flash-lite-preview-02-05
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-lite-preview-02-05")
        
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
        
        # Standardize Base64 input
        if "," in base64_image:
            # Strip data:image/...;base64, header if present
            base64_image = base64_image.split(",")[1]
            
        message_content = [
            {
                "type": "text",
                "text": f"Instruction: {system_instruction}\n\nUser request: {prompt}"
            },
            {
                "type": "image_url",
                "image_url": f"data:image/jpeg;base64,{base64_image}"
            }
        ]
        
        # Call the model
        message = HumanMessage(content=message_content)
        response = await structured_llm.ainvoke([message])
        return response
        
# Singleton instance
langchain_service = LangChainService()
