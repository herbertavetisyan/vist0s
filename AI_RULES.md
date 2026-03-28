# AI IDE Rules and Guidelines

These rules apply to all AI assistants, IDEs (like Cursor, Antigravity, Copilot), and automated agents working on this project. 
When working on this project, you must read and adhere to these rules before writing any code.

## Core Architectural Rules

1. **SOLID Principles**: Adhere strictly to SOLID object-oriented design principles. Classes and modules should have a single responsibility, be open for extension but closed for modification, and depend on abstractions rather than concretions.
2. **DRY (Don't Repeat Yourself)**: Avoid code duplication. Extract reusable logic into helper functions, utilities, or shared services.
3. **No Magic Strings**: Magic strings and numbers are strictly prohibited. Always use defined constants, enums, or configuration variables mapped in a centralized constants file.
4. **Thin Controllers / Fat Services**: 
   - **Controllers** must NEVER contain business logic. Their sole responsibility is to handle HTTP requests, parse input, call the appropriate Service layer method, and return the HTTP response.
   - **Services** must contain all business logic, database interactions, and external API calls. Controllers should delegate execution to these services.
5. **Keep It Simple (KISS)**: Do not overcomplicate solutions. Write clean, readable, and straightforward code. Avoid premature optimization and deep, unnecessary abstractions.

## Project Specific Directives
- **Supreme Source of Truth**: When determining architectural patterns or the rules of engagement for this project, this file is the definitive guide. Always abide by the rules outlined above.
- **Debugging Protocol (MANDATORY)**: When asked to debug an issue, the AI MUST stop after analyzing the root cause. It must report the findings and proposed solution, and wait for explicit user approval before executing any file edits or terminal commands.
