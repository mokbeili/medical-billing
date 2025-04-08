# Medical Billing Code Search

A React-based application for searching medical billing codes with multiple search capabilities.

## Features

- Exact code search
- Title-based search
- Synonym-based search
- AI-powered semantic search using OpenAI embeddings

## Prerequisites

- Node.js 18.x or later
- PostgreSQL 12.x or later
- OpenAI API key

## Setup

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   - Copy `.env.example` to `.env`
   - Update the database URL and OpenAI API key in `.env`

4. Set up the database:

   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Search Types

1. **Exact Code Search**: Matches the exact billing code
2. **Title Search**: Searches for matches in the code title
3. **Synonym Search**: Searches across titles and descriptions
4. **AI Search**: Uses OpenAI embeddings for semantic search

## Technologies Used

- Next.js
- React
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- OpenAI API
- pgvector
