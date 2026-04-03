# StepUp Project Plan

## Product Summary

StepUp is a personalized learning platform that combines guided study plans, AI-assisted educational content, social learning, analytics, gamification, and a coding playground in one experience.

## Architecture Overview

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- Backend: Supabase Auth, Postgres, Realtime, Storage, Edge Functions
- AI Layer: Configurable chat-completions provider managed through Supabase secrets
- Code Execution: Judge0 API

## Feature Areas

### Learner Experience

- Authentication and protected routes
- Profile management with progress, skills, and achievements
- Topic discovery, enrollment, and study-plan generation
- Module notes, quizzes, and feedback

### Community Experience

- Connection requests and accepted connections
- Social feed with posts, likes, and comments
- One-to-one messaging

### Motivation and Tracking

- XP, levels, streaks, and achievements
- Progress analytics and dashboards
- Global and weekly leaderboard views

### Practice Environment

- Browser-based coding playground
- Multi-language execution and snippet persistence

## Delivery Priorities

1. Authentication, profiles, and routing
2. Topics, enrollments, and study plans
3. Notes, quizzes, and feedback flows
4. Social feed, messaging, and connections
5. Analytics, achievements, and leaderboards
6. Playground polish and operational hardening

## Operational Notes

- Frontend credentials live in the local `.env` file.
- AI provider credentials live in Supabase Edge Function secrets.
- The codebase is provider-neutral at the AI layer and can be pointed at any OpenAI-compatible endpoint.
