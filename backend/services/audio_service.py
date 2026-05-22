import os
import uuid
from typing import List
import edge_tts
from pydub import AudioSegment
from backend.services.langchain_service import ExtractedItem

# Default voice mapping for languages
VOICE_MAPPING = {
    "en": "en-US-EmmaNeural",
    "zh": "zh-CN-XiaoxiaoNeural",
    "ja": "ja-JP-NanamiNeural",
    "ko": "ko-KR-SunHiNeural",
    "fr": "fr-FR-DeniseNeural",
    "es": "es-ES-ElviraNeural",
    "de": "de-DE-KatjaNeural",
    "ru": "ru-RU-SvetlanaNeural",
    "it": "it-IT-ElsaNeural",
}

class AudioService:
    def __init__(self):
        # Establish directory for temporary files
        self.temp_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "temp")
        os.makedirs(self.temp_dir, exist_ok=True)
        
    def _get_voice(self, lang: str) -> str:
        """
        Maps a language code to a high-quality edge-tts neural voice.
        """
        # Normalize: e.g., 'en-US' -> 'en', 'ZH' -> 'zh'
        lang_normalized = lang.lower().split('-')[0].split('_')[0]
        return VOICE_MAPPING.get(lang_normalized, "en-US-EmmaNeural")
        
    async def generate_stitched_audio(self, items: List[ExtractedItem], read_along: bool) -> str:
        """
        Synthesizes audio for each item, calculates gaps based on read_along mode,
        stitches the items together, and returns the path to the resulting MP3 file.
        """
        if not items:
            raise ValueError("No text items provided to synthesize.")
            
        combined_audio = AudioSegment.empty()
        temp_files = []
        
        try:
            for idx, item in enumerate(items):
                # Map language to a natural-sounding neural voice
                voice = self._get_voice(item.language)
                
                temp_filename = f"temp_{uuid.uuid4().hex}_{idx}.mp3"
                temp_filepath = os.path.join(self.temp_dir, temp_filename)
                
                # Generate audio using edge-tts
                communicate = edge_tts.Communicate(item.text, voice)
                await communicate.save(temp_filepath)
                temp_files.append(temp_filepath)
                
                # Load the clip with pydub
                clip = AudioSegment.from_file(temp_filepath, format="mp3")
                
                # Calculate silence duration in milliseconds
                if read_along:
                    # Silence = clip duration + 1 second (1000ms)
                    silence_duration_ms = len(clip) + 1000
                else:
                    # Silence = 1 second (1000ms)
                    silence_duration_ms = 1000
                    
                # Create silence segment
                silence_segment = AudioSegment.silent(duration=silence_duration_ms)
                
                # Append clip and silence
                combined_audio += clip + silence_segment
                
            # Export the combined audio
            output_filename = f"combined_{uuid.uuid4().hex}.mp3"
            output_filepath = os.path.join(self.temp_dir, output_filename)
            combined_audio.export(output_filepath, format="mp3")
            
            return output_filepath
            
        finally:
            # Clean up individual temporary files
            for filepath in temp_files:
                try:
                    if os.path.exists(filepath):
                        os.remove(filepath)
                except Exception as e:
                    print(f"Error cleaning up temp file {filepath}: {e}")

# Singleton instance
audio_service = AudioService()
