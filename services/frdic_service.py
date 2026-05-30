import os
import httpx

FRDIC_BASE_URL = "https://api.frdic.com/api/open/v1/studylist"


class FRDicService:
    """Proxy service for the FRDic (法语助手/欧路词典) OpenAPI.

    Reads EUDIC_API_TOKEN lazily from the environment on each request.
    If not set, the frontend can call set_token() to provide one at runtime.
    """

    def __init__(self):
        self._token_override = None  # Set via set_token() at runtime
        self.base_url = FRDIC_BASE_URL

    @property
    def token(self) -> str | None:
        """Return the override token if set, otherwise fall back to env var."""
        return self._token_override or os.getenv("EUDIC_API_TOKEN")

    def has_token(self) -> bool:
        return bool(self.token)

    def set_token(self, token: str) -> None:
        """Set or update the API token at runtime (e.g. from frontend input)."""
        self._token_override = token

    def _headers(self) -> dict:
        return {
            "Authorization": self.token,
            "Content-Type": "application/json",
        }

    async def _request(self, method: str, path: str, **kwargs) -> dict:
        """Make an authenticated request to the FRDic API."""
        url = f"{self.base_url}/{path}"
        headers = {**self._headers(), **kwargs.pop("headers", {})}
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.request(method, url, headers=headers, **kwargs)
            resp.raise_for_status()
            return resp.json()

    async def list_books(self, language: str) -> list:
        """List all vocabulary books for a given language code (en, fr, de, es)."""
        data = await self._request("GET", f"category?language={language}")
        # The API returns either a list directly or { "data": [...] }
        if isinstance(data, list):
            return data
        return data.get("data", [])

    async def create_book(self, language: str, name: str) -> dict:
        """Create a new vocabulary book. Returns the created book object with its id."""
        data = await self._request(
            "POST", "category", json={"language": language, "name": name}
        )
        # Response: { "data": { "id": "...", "name": "...", ... }, "message": "" }
        return data.get("data", data)

    async def add_words(
        self, language: str, category_id: str, words: list[str]
    ) -> dict:
        """Bulk-add words to a vocabulary book. Returns import status message."""
        return await self._request(
            "POST",
            "words",
            json={"language": language, "category_id": category_id, "words": words},
        )


# Singleton instance
frdic_service = FRDicService()
