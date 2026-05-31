import io
import os
import tempfile
from typing import List
import edge_tts
from pydub import AudioSegment
from services.langchain_service import ExtractedItem

# French neural voice for French text
FRENCH_VOICE = "fr-FR-DeniseNeural"
# Default fallback voice for non-French items
DEFAULT_VOICE = "en-US-EmmaNeural"

class AudioService:
    def _get_voice(self, lang: str) -> str:
        """
        Maps a language code to a neural voice.
        French items get a native French voice; everything else uses a default fallback.
        """
        # Normalize: e.g., 'en-US' -> 'en', 'ZH' -> 'zh'
        lang_normalized = lang.lower().split('-')[0].split('_')[0]
        if lang_normalized == "fr":
            return FRENCH_VOICE
        return DEFAULT_VOICE

    async def generate_stitched_audio(self, items: List[ExtractedItem], read_along: bool, voice_speed: float = 1.0) -> bytes:
        """
        Synthesizes audio for each item, calculates gaps based on read_along mode,
        stitches the items together, and returns the resulting MP3 as bytes.
        No files are persisted — everything is built in memory.
        """
        if not items:
            raise ValueError("No text items provided to synthesize.")

        combined_audio = AudioSegment.empty()
        temp_files = []

        # Convert float speed to edge-tts rate format, e.g. 1.0 -> "+0%", 1.25 -> "+25%", 0.85 -> "-15%"
        if voice_speed >= 1.0:
            percentage = int(round((voice_speed - 1.0) * 100))
            rate = f"+{percentage}%"
        else:
            percentage = int(round((1.0 - voice_speed) * 100))
            rate = f"-{percentage}%"

        try:
            for idx, item in enumerate(items):
                # Map language to a natural-sounding neural voice
                voice = self._get_voice(item.language)

                # Use a system temp file for the individual clip (cleaned up in finally)
                temp_file = tempfile.NamedTemporaryFile(suffix='.mp3', delete=False)
                temp_filepath = temp_file.name
                temp_file.close()  # Close so edge-tts can write to it
                temp_files.append(temp_filepath)

                # Generate audio using edge-tts
                communicate = edge_tts.Communicate(item.text, voice, rate=rate)
                await communicate.save(temp_filepath)

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

            # Export the combined audio to an in-memory buffer
            buffer = io.BytesIO()
            combined_audio.export(buffer, format="mp3")
            return buffer.getvalue()

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
