# StepUp Learning Hub

StepUp Learning Hub is a full-stack learning platform focused on personalized study workflows, AI-assisted content generation, social learning, analytics, and coding practice.

## Core Capabilities

- Personalized study plans generated per topic enrollment
- Module notes, quizzes, and feedback powered by a configurable AI provider
- Social feed, direct connections, and messaging
- Progress tracking, achievements, streaks, and leaderboards
- In-browser coding playground with multi-language execution

## Tech Stack

- React 18, TypeScript, and Vite
- Tailwind CSS and shadcn/ui
- Supabase Auth, Postgres, Realtime, Storage, and Edge Functions
- Judge0 API for code execution

## Local Development

1. Install dependencies with `npm install`.
2. Create a local `.env` file with your frontend environment variables.
3. Start the app with `npm run dev`.
4. Build for production with `npm run build`.
5. Run tests with `npm test`.

## Frontend Environment Variables

Create a `.env` file in the project root with:

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_PROJECT_ID="your-project-id"
```

## Edge Function Secrets

Set these secrets in Supabase for the AI-backed edge functions:

- `AI_API_KEY`
- `AI_MODEL`
- `AI_API_URL` (optional, defaults to the standard OpenAI-compatible chat completions endpoint)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Example:

```sh
supabase secrets set AI_API_KEY=your-key
supabase secrets set AI_MODEL=your-model
supabase secrets set AI_API_URL=https://api.openai.com/v1/chat/completions
```

Any provider that supports the OpenAI-compatible `chat/completions` format can be wired in through those secrets.

## Project Structure

- `src/` contains the frontend application
- `supabase/functions/` contains edge functions
- `supabase/migrations/` contains database migrations
- `docs/` contains project documentation

## Documentation

The implementation overview now lives in [docs/project-plan.md](docs/project-plan.md).
# StepUp
# StepUp
