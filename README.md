# BarcodeX Inventory Builder

A comprehensive inventory management system built with React, TypeScript, and Supabase.

## Key Features

- Dynamic Form Builder with formula support
- Asset Type Management
- Inventory Tracking
- Organization Management with hierarchical structures
- User Authentication and Authorization
- File Upload Management

## Technology Stack

- **Frontend**: React, TypeScript, Shadcn UI, Vite
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: React Hooks
- **Styling**: TailwindCSS

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or bun

### Installation

1. Clone the repository:
   ```
   git clone [repository-url]
   cd barcodex-inventory-builder
   ```

2. Install dependencies:
   ```
   npm install
   # or
   bun install
   ```

3. Start the development server:
   ```
   npm run dev
   # or
   bun run dev
   ```

4. Open your browser and navigate to `http://localhost:8080`

## Project Structure

- `src/components`: UI components organized by feature
- `src/hooks`: Custom React hooks for state management
- `src/pages`: Page components
- `src/services`: API services and data operations
- `src/lib`: Utilities and helper functions
- `src/types`: TypeScript type definitions
- `src/integrations`: Third-party integrations (Supabase)

## Features

### Form Builder

The Form Builder allows users to create dynamic forms with various field types including:
- Text fields
- Number fields
- Dropdowns
- Checkboxes
- Radio buttons
- Formula fields (with mathematical expressions)
- File upload fields

Forms can include conditional logic to show/hide fields based on user input.

### Formula Evaluator

The built-in formula evaluator allows for safe evaluation of mathematical expressions:

- Supports basic operations: +, -, *, /, %, ^
- Supports functions: min, max, abs, round, floor, ceil, sqrt, pow
- Variables can reference other fields in the form
- Secure implementation without using eval() or Function()

### Asset Management

- Create and manage asset types
- Define custom forms for each asset type
- Track assets with customizable fields
- Generate reports on asset status and inventory

### Organization Management

- Create hierarchical organization structures
- Manage user roles and permissions
- Share assets and forms across organizations

## Development

### Generating Supabase Types

To update TypeScript definitions from your Supabase schema:

```
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
