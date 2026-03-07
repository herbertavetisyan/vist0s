# AI IDE Rules and Guidelines — Client (React Frontend)

These rules apply to all AI assistants, IDEs (like Cursor, Antigravity, Copilot), and automated agents working on the client-side of this project.
When working on the frontend, you must read and adhere to these rules before writing any code.

## Core Architectural Rules

1. **SOLID Principles**: Components should have a single responsibility. Extract reusable logic into custom hooks or utility functions. Favor composition over inheritance.
2. **DRY (Don't Repeat Yourself)**: Avoid duplicating JSX blocks, styles, or logic across components. Extract shared UI patterns into reusable components and shared logic into custom hooks or helper modules.
3. **No Magic Strings**: Magic strings and numbers are strictly prohibited. Always use defined constants for API paths, route names, stage labels, status values, and configuration. Centralize these in a dedicated constants file.
4. **Thin Components / Fat Services**:
   - **Components** must focus on rendering UI and handling user interactions. They should not contain raw API calls or complex data transformations inline.
   - **Services** (e.g., `api.js`, dedicated service modules) must handle all API communication. Components call service methods and react to the results.
5. **Keep It Simple (KISS)**: Do not overcomplicate solutions. Write clean, readable, and straightforward JSX. Avoid premature optimization and unnecessary abstractions.

## Project Specific Directives

- **Supreme Source of Truth**: When determining patterns or rules for the client-side of this project, this file is the definitive guide. Always abide by the rules outlined above.
