# Logistiq Inventory Management System

A comprehensive, production-ready inventory management system built with React, TypeScript, and Supabase. Featuring complete inventory workflows, smart asset tracking, dynamic forms, enterprise-grade audit capabilities, and mobile QR workflows.

## 🚀 Key Features

- **✅ Complete Inventory Management** with one-to-one asset-inventory tracking
- **✅ Smart Asset Workflow** with automatic inventory creation and visual indicators
- **✅ Enterprise-Grade Reporting** with sub-second performance and materialized views
- **✅ Dynamic Form Builder** with formula support and inventory actions
- **✅ Professional UI/UX** with mobile responsiveness and loading states
- **✅ Asset Type Management** with barcode/QR code generation
- **✅ Real-Time Inventory Tracking** with stock warnings and freshness indicators
- **✅ Organization Management** with complete data isolation
- **✅ Complete Audit Trail** with form-based data capture and history tracking
- **✅ Advanced Analytics** and performance monitoring
- **✅ Mobile QR Workflow** with PIN authentication for field operations
- **✅ Firebase Production Deployment** with global CDN and SSL

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **UI Components**: Shadcn/ui with Radix UI primitives
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **Hosting**: Firebase Hosting with global CDN and SSL
- **State Management**: React Hooks with TanStack Query
- **Charts**: Recharts for data visualization
- **QR/Barcode**: html5-qrcode, jsqr, qrcode.react, jsbarcode
- **Forms**: React Hook Form with Zod validation
- **Styling**: TailwindCSS with CSS variables

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or bun package manager
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd barcodex-inventory-builder
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```

3. Set up environment variables:
   ```bash
   # Create .env.local file (not tracked in git)
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   bun run dev
   ```

5. Open your browser and navigate to `http://localhost:8080`

### Available Scripts

- `npm run dev` - Start development server (port 8080)
- `npm run build` - Build for production
- `npm run build:production` - Build with production optimizations
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run deploy` - Build and deploy to Firebase
- `npm run deploy:hosting` - Deploy only hosting (faster)

## Project Structure

```
src/
├── components/          # UI components organized by feature
│   ├── auth/           # Authentication components
│   ├── dashboard/      # Dashboard and stats components  
│   ├── forms/          # Dynamic form builder and rendering
│   ├── inventory/      # Complete inventory management components
│   ├── organization/   # Organization and user management
│   ├── reporting/      # Advanced reporting system
│   └── ui/             # Shadcn/ui components
├── hooks/              # Custom React hooks
├── pages/              # Page components with routing
├── services/           # API services and data operations
├── lib/                # Utilities and helper functions
├── types/              # TypeScript type definitions
├── integrations/       # Third-party integrations (Supabase)
└── utils/              # Utility functions

docs/                   # Comprehensive documentation
supabase/              # Database migrations and functions
```

## Major Features

### 🏗️ **Complete Inventory Management System**

**Status: ✅ PRODUCTION READY**

Enterprise-grade inventory functionality:

- **Asset-Inventory Integration**: Automatic inventory creation when assets are created
- **Smart Navigation**: Context-aware buttons (History, Edit Inventory, Add Inventory)
- **Visual Status Indicators**: Real-time stock levels, freshness indicators (🟢🟡🔴), and stock warnings (🚨⚠️)
- **Complete Audit Trail**: Full history of all inventory events with form data
- **Mobile-Ready**: Responsive design optimized for field operations
- **Error Prevention**: Comprehensive validation and fallback behaviors

### 📱 **Mobile QR Workflow**

**Status: ✅ PRODUCTION READY AND DEPLOYED**

Complete mobile QR scanning workflow for field operations:

- **Anonymous Access**: Scan QR codes and view asset info without authentication
- **PIN Authentication**: Secure PIN-based authentication for form submissions
- **Organization Context**: PIN provides proper data scoping and access control
- **Form Integration**: Full inventory forms accessible through mobile workflow
- **Production Deployment**: Fully functional on Firebase hosting with SSL
- **Security**: Enhanced RLS policies for secure anonymous access

### 📝 **Dynamic Form Builder**

**Status: ✅ PRODUCTION READY**

Enterprise-grade form creation capabilities:

- **Advanced Field Types**: Text, number, textarea, select, date, checkbox, calculated, and current inventory fields
- **Formula System**: Visual and text-based formula editors with conversion field integration
- **Asset Type Integration**: Automatic linking to asset types for enhanced field mapping
- **Inventory Actions**: Configure how fields affect inventory levels (add, subtract, set, none)
- **Cross-Form References**: Access fields from other forms linked to the same asset type
- **Real-time Validation**: Instant feedback on formula syntax and field references
- **Mock Value Testing**: Test formulas with sample data before deployment
- **Mobile-Responsive**: Professional UI optimized for both desktop and mobile use

### 🚀 **Enterprise Reporting System**

**Status: ✅ PRODUCTION READY**

World-class reporting with:

- **Sub-second Performance**: Queries optimized from 3-5 seconds to 200-500ms
- **Advanced Filtering**: 14 operators including regex, fuzzy matching, and between ranges
- **Real-time Preview**: Auto-updating report preview with intelligent debouncing
- **Smart Caching**: Intelligent LRU cache with memory management
- **Performance Monitoring**: Live execution statistics and optimization recommendations
- **Parallel Processing**: Process multiple data sources simultaneously
- **Materialized Views**: Pre-computed aggregations for instant results

### 🔢 **Formula Evaluator**

**Status: ✅ PRODUCTION READY**

Secure mathematical expression evaluation:

- **🔒 Zero eval() Usage**: Complete security with mathjs-powered evaluation engine
- **Basic Operations**: +, -, *, /, %, ^ with JavaScript-compatible behavior
- **Field References**: Variables can reference other fields and mapped conversion fields
- **Performance Optimized**: Intelligent caching system with significant speedup
- **Real-time Validation**: Instant syntax checking and error feedback
- **Mock Value Testing**: Test formulas with sample data before deployment

### 📦 **Asset Management**

**Status: ✅ PRODUCTION READY**

- Create and manage asset types with barcode/QR code generation
- **Automatic inventory creation** when assets are created
- Define custom forms for each asset type (intake, inventory, custom)
- Track assets with customizable fields and complete audit history
- Generate reports on asset status and inventory
- Parent-child relationships for complex equipment
- Price history tracking for financial reporting

### 🏢 **Organization Management**

**Status: ✅ PRODUCTION READY**

- Single organization per user with complete data isolation
- System administrators can view and manage all organizations
- Manage user roles and permissions within organizations
- Advanced diagnostic tools for system monitoring
- **Enhanced RLS policies** prevent cross-organization data access
- Organization and user deletion capabilities

## Production Deployment

### Firebase Hosting

The system is deployed on Firebase hosting with:

- **Global CDN**: Sub-second loading times worldwide
- **SSL/HTTPS**: Automatic SSL certificates for secure mobile camera access
- **SPA Routing**: Proper routing configuration for all mobile QR URLs
- **Performance**: Optimized build with chunk splitting and caching

### Deployment Commands

```bash
# Build for production
npm run build:production

# Deploy to Firebase (includes build)
npm run deploy

# Deploy only hosting (faster, includes build)
npm run deploy:hosting

# Test production build locally
npm run check-build
```

### Environment Configuration

For production deployment, ensure environment variables are configured:

```bash
# Environment variables (set in hosting provider)
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_anon_key
```

## Development

### Database Migrations

Apply database migrations using Supabase:

```bash
# Using Supabase CLI
supabase db push

# Or apply directly in Supabase Dashboard
# Navigate to SQL Editor and run migration files from supabase/migrations/
```

### Generating TypeScript Types

Update TypeScript definitions from your Supabase schema:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
```

### Performance Optimization

The system includes advanced database optimizations. For maintenance:

1. Use Supabase Dashboard or CLI to apply migrations
2. Apply migrations in the `supabase/migrations` folder in order
3. Run maintenance functions: `SELECT run_reporting_maintenance();`

## 📚 Documentation

-   **[🚀 New Guided Report Builder](./docs/Features/06_Reporting_and_Analytics.md)** - **(NEW)** Complete guide to the new business-friendly report builder.
-   [Firebase Deployment Guide](./docs/FIREBASE-DEPLOYMENT-GUIDE.md) - Complete Firebase hosting and deployment.
-   [Implementation Complete](./docs/implementation-complete.md) - Current system status and completed features.
-   [Inventory Workflow Implementation](./docs/InventoryWorkflowPlan.md) - Complete inventory system documentation.
-   [Form Builder Documentation](./README-FORM-builder.md) - Comprehensive form creation and management guide.
-   [Database Model](./supabase/docs/data-model.md) - Complete data model and relationships.
-   [Mobile QR + PIN Workflow](./docs/MOBILE-QR-PIN-WORKFLOW.md) - Documented exception, rationale, mitigations, and roadmap.

## Security Features

- **Row-Level Security (RLS)**: Comprehensive RLS policies across all database tables
- **Organization Isolation**: Complete data separation between organizations
- **Mobile PIN Authentication**: Secure PIN-based authentication for mobile workflows
- **SSL/HTTPS**: Enforced HTTPS through Firebase hosting
- **Input Validation**: Client and server-side validation throughout
- **Secure Formula Evaluation**: Zero eval() usage with mathjs-based safe evaluation

## Performance Features

- **Optimized Queries**: Sub-second response times for most operations
- **Materialized Views**: Pre-computed aggregations for instant reporting
- **Smart Caching**: LRU cache with intelligent memory management
- **Chunk Splitting**: Optimized JavaScript bundles for faster loading
- **CDN Distribution**: Global content delivery through Firebase
- **Lazy Loading**: Component-level code splitting for improved initial load

## User Management

### Organization Deletion
Organization admins can permanently delete their entire organization through the Advanced Settings tab. This action:

- Removes all organization members (users are completely deleted)
- Deletes all assets, inventory items, forms, and reports
- Cannot be undone
- Requires typing "DELETE ORGANIZATION" to confirm

### User Management
Organization admins have two options for managing users:

1. **Remove from Organization**: Removes user from the organization but keeps their account
2. **Delete User Permanently**: Completely removes the user and all their data from the system

Both actions are available in the Members tab of Organization Settings.

## Support and Contributing

- All major features have been implemented and tested
- The system is production-ready and deployed
- Comprehensive documentation is available in the `docs/` directory
- For technical implementation details, see the technical documentation files

## 🎉 Production Status

**✅ SYSTEM IS PRODUCTION READY AND DEPLOYED**

The Logistiq Inventory Management System is a fully-featured, enterprise-grade platform that provides:

- **Professional Inventory Management** with complete audit trails
- **Sub-second Performance** for all operations  
- **Mobile-Responsive Design** for field operations with QR workflow
- **Complete Security** with organization isolation and mobile PIN authentication
- **Firebase Production Hosting** with global CDN and SSL
- **Comprehensive Testing** and validation
- **Extensive Documentation** and deployment guides

All major features have been implemented, tested, verified, and deployed to production on Firebase hosting. The system is ready for full production use and field operations.

**🌐 Live Deployment**: Available on Firebase hosting with global availability
**📱 Mobile QR**: Fully functional mobile QR workflow with PIN authentication  
**🔒 Security**: Enterprise-grade security with proper RLS policies and SSL