# BarcodeX Inventory Builder

A comprehensive inventory management system built with React, TypeScript, and Supabase.

## Key Features

- **Enterprise-Grade Reporting System** with sub-second performance
- Dynamic Form Builder with formula support
- Asset Type Management with barcode/QR code generation
- Inventory Tracking with real-time updates
- Organization Management (simplified to one organization per user)
- User Authentication and Authorization (within their organization)
- File Upload Management
- Advanced Analytics and Performance Monitoring

## Technology Stack

- **Frontend**: React, TypeScript, Shadcn UI, Vite
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: React Hooks
- **Styling**: TailwindCSS
- **Reporting**: Optimized query engine with materialized views

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
- `docs`: Comprehensive documentation

## Major Features

### 🚀 Enterprise Reporting System

The latest addition is a world-class reporting system with:

- **Sub-second Performance**: Queries that previously took 3-5 seconds now complete in 200-500ms
- **Advanced Filtering**: 14 operators including regex, fuzzy matching, and between ranges
- **Real-time Preview**: Auto-updating report preview with 800ms debouncing
- **Smart Caching**: Intelligent LRU cache with 50MB memory management
- **Performance Monitoring**: Live execution statistics and optimization recommendations
- **Parallel Processing**: Process up to 3 data sources simultaneously
- **Materialized Views**: Pre-computed aggregations for instant results

For detailed documentation, see [Optimized Reporting System](./docs/OPTIMIZED-REPORTING-SYSTEM.md).

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

- Create and manage asset types with barcode/QR code generation
- Define custom forms for each asset type
- Track assets with customizable fields
- Generate reports on asset status and inventory
- Parent-child relationships for complex equipment
- Price history tracking for financial reporting

### Organization Management

- Users belong to a single organization
- System administrators can view and manage all organizations
- Manage user roles (e.g., admin, member) and permissions within their organization
- Advanced diagnostic tools for system monitoring

## Development

### Generating Supabase Types

To update TypeScript definitions from your Supabase schema:

```
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
```

### Running Database Migrations

The system includes advanced database optimizations. To apply performance migrations:

1. Use Supabase Dashboard or CLI
2. Apply migrations in the `supabase/migrations` folder
3. Run maintenance functions: `SELECT run_reporting_maintenance();`

## Documentation

- [Main Documentation](./BARCODEX-README.md) - Comprehensive system overview
- [Optimized Reporting System](./docs/OPTIMIZED-REPORTING-SYSTEM.md) - Enterprise reporting features
- [Barcode Integration](./docs/BARCODE-INTEGRATION.md) - Barcode/QR code functionality
- [Form Builder Guide](./docs/BARCODE-COMPONENT-GUIDE.md) - Form creation and management
- [Technical Implementation](./docs/BARCODE-TECHNICAL-IMPLEMENTATION.md) - Developer reference