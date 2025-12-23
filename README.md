# AI Support Chat System

A production-quality AI live chat agent web application for e-commerce customer support. Built with TypeScript, React, Express, PostgreSQL, and multi-provider LLM support (Gemini + OpenAI).

## Features

- **Real-time AI Chat** - Powered by Gemini or OpenAI with automatic fallback
- **E-commerce Focus** - Pre-configured with shipping, returns, and support knowledge
- **Persistent Conversations** - Messages stored in PostgreSQL, restored on page reload
- **Modern UI** - Built with Tailwind CSS and shadcn/ui components
- **Input Validation** - Zod-based validation with friendly error messages
- **Clean Architecture** - Separated routes, services, and repositories

## Tech Stack

| Layer      | Technology                       |
| ---------- | -------------------------------- |
| Frontend   | Vite + React 19 + TypeScript     |
| Styling    | Tailwind CSS + shadcn/ui         |
| Backend    | Node.js + Express 5 + TypeScript |
| Database   | PostgreSQL + Drizzle ORM         |
| Cache      | Redis (optional)                 |
| LLM        | Gemini + OpenAI (selectable)     |
| Validation | Zod                              |

## Project Structure

```
ai-chat-bot/
├── client/                 # Frontend (Vite + React)
│   └── src/
│       ├── components/     # UI components
│       ├── hooks/          # Custom React hooks
│       └── services/       # API client
├── server/                 # Backend (Express)
│   └── src/
│       ├── config/         # Environment config
│       ├── db/             # Drizzle schema & connection
│       ├── middleware/     # Validation, error handling
│       ├── repositories/   # Database access layer
│       ├── routes/         # HTTP endpoints
│       ├── services/       # Business logic & LLM
│       └── types/          # TypeScript types
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL 14+
- Redis (optional)

### 1. Clone & Install

```bash
git clone <repo-url>
cd ai-chat-bot

# Install dependencies
cd server && npm install
cd ../client && npm install
```

### 2. Configure Environment

Create `server/.env`:

```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/ai_chat

# LLM Configuration (pick one provider)
LLM_PROVIDER=gemini  # or "openai"
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key  # Optional, enables fallback

REDIS_URL=redis://localhost:6379  # Optional
```

Create `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:4000
```

### 3. Setup Database

```bash
cd server

# Push schema to database
npm run drizzle-kit push
```

### 4. Run Development Servers

```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
cd client && npm run dev
```

Open http://localhost:5173 to use the chat.

## API Reference

### POST /chat/message

Send a message and receive an AI reply.

**Request:**

```json
{
  "message": "What are your shipping options?",
  "sessionId": "optional-uuid-for-continuing-conversation"
}
```

**Response:**

```json
{
  "reply": "We offer Standard (5-7 days, free over $50), Express (2-3 days, $9.99)...",
  "sessionId": "uuid-for-this-conversation"
}
```

### GET /chat/history/:sessionId

Retrieve conversation history.

**Response:**

```json
{
  "sessionId": "uuid",
  "messages": [
    { "id": "uuid", "sender": "user", "content": "...", "createdAt": "..." },
    { "id": "uuid", "sender": "ai", "content": "...", "createdAt": "..." }
  ]
}
```

## Architecture

### Layers

1. **Routes** - Thin HTTP handlers, validation only
2. **Services** - Business logic orchestration
3. **Repositories** - Database operations
4. **LLM Service** - AI provider abstraction

### LLM Providers

The system supports **multiple LLM providers** behind a common interface:

| Provider | Model          | Best For                                |
| -------- | -------------- | --------------------------------------- |
| Gemini   | gemini-3-flash | Default, fast responses                 |
| OpenAI   | gpt-4o-mini    | Alternative, when Gemini quota exceeded |

**Provider Selection:**

```bash
LLM_PROVIDER=gemini  # or "openai"
```

**Automatic Fallback:**
If the primary provider fails with a retryable error (rate limit, timeout), the system automatically retries with the fallback provider (if configured).

```
Primary (Gemini) fails → Retry with OpenAI → Return response
```

This behavior requires both API keys to be configured. Fallback is transparent to business logic.

### LLM Provider Interface

The LLM is abstracted behind an interface for easy swapping:

```typescript
interface LLMProvider {
  generateReply(history: Message[], userMessage: string): Promise<string>;
}
```

To add a new provider, implement this interface and register it in `llm.factory.ts`.

### System Prompt Strategy

The AI is configured as "TechStyle Electronics" support agent with:

- **Role Definition** - Helpful, professional customer support
- **Domain Knowledge** - Shipping, returns, support hours, product categories
- **Behavioral Guidelines** - Concise answers, admitting limitations
- **Context Window** - Last 10 messages for conversation continuity

## Error Handling

| Scenario                 | Behavior                                   |
| ------------------------ | ------------------------------------------ |
| Empty message            | 400 with validation error                  |
| Message too long (>10KB) | 400 with validation error                  |
| Invalid sessionId format | 400 with validation error                  |
| Non-existent sessionId   | Creates new conversation                   |
| LLM API failure          | Returns friendly fallback message          |
| Server error             | 500 with generic message (no stack traces) |
| Rate limit exceeded      | Friendly message with retry time           |

## Redis (Optional)

Redis is used as an **optional optimization layer** for:

- **Session existence caching** - Reduces DB lookups for active sessions (6hr TTL)
- **Rate limiting** - Protects API from abuse (15 req/min per IP on both `/chat/message` and `/chat/history`)

PostgreSQL remains the **source of truth**. The app works normally without Redis.

```bash
# To enable Redis, add to .env:
REDIS_URL=redis://localhost:6379
```

If Redis is unavailable or `REDIS_URL` is not set:

- App continues with DB-only mode
- No crashes or errors
- Rate limiting is bypassed
