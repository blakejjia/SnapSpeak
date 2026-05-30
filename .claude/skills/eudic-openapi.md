# Eudic OpenAPI Skill

Manage the user's Eudic (欧路词典) / French Assistant (法语助手) / German Assistant (德语助手) / Spanish Assistant (西语助手) vocabulary lists, user corpus entries, notes, and word data via the Eudic OpenAPI.

## When to Use

Invoke this skill when the user asks to:
- View, create, rename, or delete vocabulary books (生词本)
- Add, query, or delete words in a vocabulary book
- Query user corpus entries (语料) by recent days or favorited status
- Batch query word details from user corpus
- View, create, or delete word notes (笔记)
- Anything involving "Eudic", "欧路", "法语助手", "德语助手", "西语助手"

## Prerequisites

The user needs a Eudic OpenAPI token:

1. Visit https://my.eudic.net/OpenAPI/Authorization to get an API token
2. Add it to the project `.env` file as:
   ```
   EUDIC_API_TOKEN=NIS your_token_here
   ```

**Before making any API call**, check that `EUDIC_API_TOKEN` is present in `.env`. If missing, ask the user to provide it.

## Language Codes

| Language | `language` param | App Name |
|----------|-----------------|----------|
| English | en | 欧路词典 |
| French | fr | 法语助手 |
| German | de | 德语助手 |
| Spanish | es | 西语助手 |

## Base URL

All endpoints live under `https://api.frdic.com/api/open/v1/studylist/`.

## Executing API Calls

Read `EUDIC_API_TOKEN` from `.env` and use it in an `Authorization` header. Use the **Bash tool** with `curl` to make calls. Always include `-s` for silent mode. Pipe through `python -m json.tool` or `jq` for readable output when appropriate.

**IMPORTANT**: Before any destructive operation (DELETE, PATCH rename, bulk add/delete), confirm with the user first.

---

## API Reference

### 1. List All Vocabulary Books

```
GET /category?language={en|fr|de|es}
Authorization: {EUDIC_API_TOKEN}
```

Returns: id, language, name, add_time for each book.

### 2. Create a Vocabulary Book

```
POST /category
Content-Type: application/json
Body: {"language": "en", "name": "Book Name"}
```

### 3. Rename a Vocabulary Book

```
PATCH /category
Content-Type: application/json
Body: {"id": "BOOK_ID", "language": "en", "name": "New Name"}
```

### 4. Delete a Vocabulary Book

```
DELETE /category
Content-Type: application/json
Body: {"id": "BOOK_ID", "language": "en", "name": "Book Name"}
```

### 5. List Words in a Vocabulary Book

```
GET /words?language=en&category_id=0&page=1&page_size=100
```

Parameters:
- `language`: en/fr/de/es (required)
- `category_id`: book ID (required)
- `page`: page number (optional, default 1)
- `page_size`: per page (optional, default 100)

Returns: word, phon, exp, add_time, star, context_line.

### 6. Batch Add Words

```
POST /words
Content-Type: application/json
Body: {"language": "en", "category_id": "0", "words": ["apple", "banana"]}
```

### 7. Delete Words

```
DELETE /words
Content-Type: application/json
Body: {"language": "en", "category_id": "0", "words": ["apple"]}
```

### 8. Add Single Word

```
POST /word
Content-Type: application/json
Body: {"language": "en", "word": "hello", "star": 2, "context_line": "Hello, how are you?"}
```

Optional fields: `star` (1-5), `context_line`, `category_ids` (list).

### 9. Query a Word

```
GET /word?language=en&word=hello
```

Returns word details.

### 10. List Notes

```
GET /notes?page=0&page_size=100
```

Returns: word, note, language, add_time.

### 11. Query User Corpus Entries

```
GET /vocab_entries?language=en&recent_days=30&is_favorited=true&page=0&page_size=20
```

Parameters:
- `language`: en/fr/de/es (required)
- `recent_days`: filter by recent N days (optional; ≤0 means no filter)
- `is_favorited`: `true` for favorited only, `false` for unfavorited only (optional)
- `page`: page number (optional, default -1; -1 = no pagination)
- `page_size`: per page (optional, default 100; only when page ≥ 0)

Returns: word, exp, add_time, rating, contexts.

### 12. Batch Query Corpus Word Details

```
POST /vocab_words
Content-Type: application/json
Body: {"language": "en", "words": ["action", "amplify"]}
```

Returns: word, exp, contexts for each.

### 13. Get Word Note

```
GET /note?word=hello
```

Returns 404 if no note exists.

### 14. Create/Update Note

```
POST /note
Content-Type: application/json
Body: {"word": "hello", "note": "Note content"}
```

### 15. Delete Note

```
DELETE /note
Content-Type: application/json
Body: {"word": "hello"}
```

---

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET) |
| 201 | Created/Modified (POST/PATCH) |
| 204 | Deleted (DELETE) |
| 400 | Bad request |
| 401 | Auth failed |
| 403 | Rate limited |

## Rate Limits

| Window | Max Requests | Ban Duration |
|--------|-------------|--------------|
| 1 minute | 30 | 1 hour |
| 30 minutes | 500 | 24 hours |

Be mindful of rate limits. Batch operations when possible (use `/words` bulk add instead of adding one at a time).
