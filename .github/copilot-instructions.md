This is a TypeScript/React full-stack application built with Remix, featuring AI-powered RAG chatbot functionality. The project includes LangChain integration for AI capabilities. Please follow these guidelines when contributing:

## Code Standards

### Required Before Each Commit

- Run `pnpm run lint` to check code quality and formatting using ESLint (.eslintrc.cjs)
- Run `pnpm run type-check` to ensure TypeScript compilation (tsconfig.json)
- Follow existing code formatting with Prettier (.prettierrc) and ESLint configurations
- Ensure all TypeScript files compile without errors

### Development Flow

- Install dependencies: `pnpm install`
- Development server: `pnpm run dev`
- Build: `pnpm run build`
- Type checking: `pnpm run type-check`
- Linting: `pnpm run lint`

## Repository Structure

- `app/`: Main Remix application code
  - `app/routes/`: Route handlers and page components
  - `app/lib/`: Core utilities and server-side logic (including RAG chatbot)
  - `app/constants/`: Configuration constants and messages
  - `app/entry.client.tsx` & `app/entry.server.tsx`: Remix entry points
  - `app/root.tsx`: Root application component
  - `app/tailwind.css`: Global styles
- `public/`: Static assets (favicon.ico, resume.pdf, og-image.png)
- Root level: Configuration files (vite.config.ts, tailwind.config.ts, postcss.config.js)

## Key Guidelines

1. Follow React and Remix best practices and conventions
2. Use TypeScript strictly - avoid `any` types, prefer proper type definitions
3. Implement proper error handling, especially for AI/LangChain operations
4. Use Tailwind CSS for styling following existing patterns in tailwind.config.ts
5. For RAG chatbot functionality in `app/lib/rag-chatbot.server.ts`, maintain singleton pattern and proper error handling
6. Follow existing file naming conventions (kebab-case for files, PascalCase for components)
7. Use server-side functions (.server.ts) for backend logic and client-side code (.client.tsx) for browser interactions
8. When working with AI/LangChain features, ensure proper async/await handling and error boundaries
9. Maintain existing project structure - don't create unnecessary nested folders
10. Write meaningful commit messages and document complex AI logic

## Technical Specifics

- **Remix Framework**: Use proper loader/action patterns for data fetching
- **Client/Server Separation**: Respect the `.client.tsx` and `.server.ts` file conventions shown in entry files
- **RAG Implementation**: The chatbot uses a singleton pattern in `rag-chatbot.server.ts` - maintain this architecture
- **Styling**: Use Tailwind CSS classes configured in tailwind.config.ts, follow existing component patterns
- **Error Handling**: Implement proper try/catch blocks, especially for AI operations
- **Type Safety**: Leverage TypeScript's type system defined in tsconfig.json, avoid `any` types
- **Build System**: Uses Vite (vite.config.ts) for bundling and development server
