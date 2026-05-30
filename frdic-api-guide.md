# 法语助手 OpenAPI Usage Guide

> A walkthrough of creating vocabulary books and adding words via the 法语助手 (frdic.com) OpenAPI.
> Created: 2026-05-30
> Base URL: `https://api.frdic.com/api/open/v1/studylist/`
> App: **法语助手** (https://www.frdic.com) — for French learners
>
> **Note:** This API is shared across 欧路词典 (English), 法语助手 (French),
> 德语助手 (German), and 西语助手 (Spanish). Which app your token works for
> depends on which app you generated it from. Each app has its own token endpoint.

## Prerequisites

1. Get an API token at https://my.frdic.com/OpenAPI/Authorization (for 法语助手)
   — or https://my.eudic.net/OpenAPI/Authorization (for 欧路词典)
2. Save it in `.env`:
   ```
   EUDIC_API_TOKEN=NIS your_token_here
   ```

## Language Codes

| Language | Code | App Name | Token Endpoint |
|----------|------|----------|----------------|
| French | `fr` | **法语助手** | my.frdic.com |
| English | `en` | 欧路词典 | my.eudic.net |
| German | `de` | 德语助手 | my.eudic.net |
| Spanish | `es` | 西语助手 | my.eudic.net |

## Walkthrough: Create FR151 Book + Add "plancher"

### Step 1: List Existing Books

```bash
curl -s "https://api.frdic.com/api/open/v1/studylist/category?language=fr" \
  -H "Authorization: NIS your_token_here"
```

**Response:** Returns a list of all French books with `id`, `name`, `add_time`.

### Step 2: Create a Book

```bash
curl -s -X POST "https://api.frdic.com/api/open/v1/studylist/category" \
  -H "Content-Type: application/json" \
  -H "Authorization: NIS your_token_here" \
  -d '{"language": "fr", "name": "FR151"}'
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "134246268387564976",
    "language": "fr",
    "name": "FR151",
    "add_time": null
  },
  "message": ""
}
```

> ⚠️ **Save the `id`** — you'll need it for adding words.

### Step 3: Bulk Add Words (POST /words ✅ Preferred)

```bash
curl -s -X POST "https://api.frdic.com/api/open/v1/studylist/words" \
  -H "Content-Type: application/json" \
  -H "Authorization: NIS your_token_here" \
  -d '{"language": "fr", "category_id": "134246268387564976", "words": ["plancher"]}'
```

**Response (201 Created):**
```json
{"message":"单词导入成功,导入数量 : 1"}
```
— "Word import successful, import count: 1"

### Step 4: Verify the Word

```bash
curl -s "https://api.frdic.com/api/open/v1/studylist/word?language=fr&word=plancher" \
  -H "Authorization: NIS your_token_here"
```

**Response (200 OK):**
```json
{
  "star": 1,
  "category_ids": [134246268387564976],
  "word": "plancher",
  "exp": "",
  "add_time": "2026-05-30T13:01:44Z"
}
```

Key fields in the response:
- `word` — The vocabulary word
- `star` — Rating (1-5, default 1)
- `category_ids` — Array of book IDs this word belongs to
- `exp` — Definition/explanation (may be empty if just added)
- `add_time` — When it was added

### Alternative: Add a Single Word (POST /word)

Use this if you need extra fields like `star` rating or `context_line`:

```bash
curl -s -X POST "https://api.frdic.com/api/open/v1/studylist/word" \
  -H "Content-Type: application/json" \
  -H "Authorization: NIS your_token_here" \
  -d '{"language": "fr", "word": "plancher", "category_ids": ["134246268387564976"]}'
```

## Complete API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/category?language={code}` | List all books for a language |
| POST | `/category` | Create a book |
| PATCH | `/category` | Rename a book |
| DELETE | `/category` | Delete a book |
| GET | `/words?language={code}&category_id={id}&page=1&page_size=100` | List words in a book |
| POST | `/words` | Bulk add words to a book |
| DELETE | `/words` | Delete words from a book |
| POST | `/word` | Add a single word (with star/context) |
| GET | `/word?language={code}&word={word}` | Query a single word's details |
| GET | `/notes?page=0&page_size=100` | List all notes |
| GET | `/note?word={word}` | Get a specific word's note |
| POST | `/note` | Create or update a note |
| DELETE | `/note` | Delete a note |
| GET | `/vocab_entries?language={code}&recent_days=30&is_favorited=true` | Query corpus entries |
| POST | `/vocab_words` | Batch query word details from corpus |

## Rate Limits

| Window | Max Requests | Ban Duration |
|--------|-------------|--------------|
| 1 minute | 30 | 1 hour |
| 30 minutes | 500 | 24 hours |

Always batch adds via `POST /words` when adding multiple words (not one-by-one).

## Troubleshooting

- **"单词导入成功"** message means success — count is the number of words added.
- **Empty `exp` field:** Newly added words may not have definitions yet; they populate as the app processes them.
- **401 Unauthorized:** Make sure your token starts with `NIS` and is in the `Authorization` header.
- **403 Rate limited:** Wait and reduce request frequency.
- **Wrong app's data:** A token from my.eudic.net only accesses 欧路词典 (English) data; a token from my.frdic.com only accesses 法语助手 (French) data. Same base URL, different data scopes.

## Key Differences: frdic.com vs eudic.net

| Aspect | 法语助手 (frdic) | 欧路词典 (eudic) |
|--------|-----------------|------------------|
| App | French learning | English learning |
| Token URL | my.frdic.com/OpenAPI/Authorization | my.eudic.net/OpenAPI/Authorization |
| API Base | same (`api.frdic.com`) | same (`api.frdic.com`) |
| Data scope | French books & words | English books & words |
| Study list URL | http://my.frdic.com/studyList | http://my.eudic.net/studyList |
