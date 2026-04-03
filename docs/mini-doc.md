# StepUp Learning Hub Mini Doc

This document is a short, code-based summary of what the repository currently implements.

## What This App Is

StepUp Learning Hub is a full-stack learning platform built around personalized study paths, AI-assisted learning content, social/community features, analytics, and an in-browser coding playground.

At a high level, the product flow is:

1. Users sign up or sign in with Supabase Auth.
2. Users explore topics and enroll in them.
3. The app can generate a study plan for an enrolled topic.
4. Each module can generate AI notes and an AI quiz.
5. Quiz attempts award XP and can return AI-generated feedback.
6. Users track progress through dashboards, analytics, streaks, levels, and leaderboards.
7. Users can also post updates, connect with other learners, chat, and practice code.

## Main Product Areas

- Authentication and protected routes
- Learner profile with avatar, bio, skills, XP, levels, streaks, and study time
- Topic discovery, topic detail pages, enrollment, and progress tracking
- AI-generated study plans, module notes, quizzes, and quiz feedback
- Dashboard, analytics, achievements, and leaderboard views
- Social feed with posts, likes, comments, and optional post images
- Connections system with request, accept, and remove flows
- One-to-one messaging with Supabase realtime updates
- Multi-language code playground with saved snippets

## Current Route Map

- `/auth`
- `/`
- `/topics`
- `/topics/:topicId`
- `/my-learning`
- `/learn/:planId`
- `/learn/:planId/module/:moduleId`
- `/quiz/:quizId`
- `/feed`
- `/connections`
- `/messages`
- `/leaderboard`
- `/playground`
- `/analytics`
- `/profile/:id`
- `/settings`

## Tech Stack

- Frontend: React 18, TypeScript, Vite
- UI: Tailwind CSS, shadcn/ui, Framer Motion
- Data/Auth/Storage/Realtime: Supabase
- State/data fetching: TanStack React Query
- Editor: Monaco
- Charts: Recharts
- AI integration: OpenAI-compatible `chat/completions` provider configured through Supabase secrets
- Code execution: Supabase Edge Function calling the Piston API

## Backend/Data Snapshot

The main database tables created by the migrations are:

- `profiles`
- `connections`
- `messages`
- `posts`
- `post_likes`
- `post_comments`
- `topics`
- `enrollments`
- `study_plans`
- `modules`
- `notes`
- `quizzes`
- `quiz_questions`
- `quiz_attempts`
- `achievements`
- `user_achievements`
- `user_progress`
- `code_snippets`

The repo also sets up public storage buckets for:

- `avatars`
- `post-images`

Row-level security policies are enabled across the app tables and storage access is scoped by user where appropriate.

## Edge Functions

- `generate-study-plan`: creates a study plan and module list for a topic
- `generate-notes`: creates notes for a module
- `generate-quiz`: creates quiz records and questions for a module
- `generate-feedback`: returns AI feedback after a quiz attempt
- `execute-code`: runs code through Piston and returns stdout/stderr/compile output

## Repo Layout

- `src/`: frontend app
- `src/pages/`: route-level screens
- `src/components/`: shared UI and layout components
- `src/hooks/`: auth, profile, and utility hooks
- `src/integrations/supabase/`: generated Supabase client/types
- `supabase/migrations/`: schema, policies, functions, triggers, and storage setup
- `supabase/functions/`: edge functions and shared AI helpers
- `docs/`: project documentation

## Local Setup

1. Install dependencies with `npm install`.
2. Create a `.env` file in the project root.
3. Set the frontend Supabase variables:

```env
VITE_SUPABASE_PROJECT_ID=""
VITE_SUPABASE_PUBLISHABLE_KEY=""
VITE_SUPABASE_URL=""
```

4. Run the dev server with `npm run dev`.
5. Build with `npm run build`.
6. Run tests with `npm test`.

For the AI-backed edge functions, Supabase secrets are expected for:

- `AI_API_KEY`
- `AI_MODEL`
- `AI_API_URL` (optional, defaults to the OpenAI chat completions endpoint)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Useful Reality Checks

- The current code runner implementation uses Piston, even though older docs in the repo mention Judge0.
- The AI layer is provider-neutral as long as the endpoint supports an OpenAI-compatible chat completions interface.
- Test coverage is currently minimal; the repo includes a placeholder Vitest example in `src/test/example.test.ts`.
