# Project Backup and New Inspection App Setup Guide

**Purpose**: Ensure clean backup of current inventory app and smooth setup of new inspection app project.

---

## 📋 **Pre-Conversion Checklist**

### **Step 1: Ensure Current App is Commit-Ready**

```bash
# Check what files are modified/untracked
git status

# Review any uncommitted changes
git diff

# Add all changes if ready
git add .

# Commit with descriptive message
git commit -m "Final inventory app state - ready for inspection app conversion

- Added MOBILE_QR_RLS_SECURITY_DOCUMENTATION.md
- Added INSPECTION_APP_CONVERSION_ROADMAP.md  
- Added PROJECT_BACKUP_AND_SETUP_GUIDE.md
- All features working and documented
- Ready for conversion to inspection app"

# Push to remote
git push origin main
```

### **Step 2: Create Backup Tags**

```bash
# Tag the current state for easy reference
git tag -a "v1.0-inventory-final" -m "Final working version of inventory management system

Features included:
- Complete inventory management with asset tracking
- Mobile QR workflow with PIN authentication
- Dynamic form builder with file uploads
- Firebase deployment ready
- Comprehensive documentation"

# Push tags to remote
git push origin --tags

# Verify tags exist
git tag -l
```

### **Step 3: Document Current Environment**

Create a snapshot of the current working environment:

```bash
# Document current dependencies
npm list --depth=0 > CURRENT_DEPENDENCIES.txt

# Document current Supabase project details (in private notes)
echo "Current Supabase Project Details:" > CURRENT_SUPABASE_CONFIG.md
echo "Project URL: [REDACTED]" >> CURRENT_SUPABASE_CONFIG.md
echo "Project ID: [REDACTED]" >> CURRENT_SUPABASE_CONFIG.md
echo "Organization: [REDACTED]" >> CURRENT_SUPABASE_CONFIG.md
echo "Region: [REDACTED]" >> CURRENT_SUPABASE_CONFIG.md
```

---

## 🚀 **New Project Setup Process**

### **Step 1: Clone and Prepare New Project**

```bash
# Navigate to your projects directory
cd ~/Desktop  # or wherever you keep projects

# Clone the current project
git clone https://github.com/your-username/barcodex-inventory-builder.git inspection-management-system

# Enter the new project directory  
cd inspection-management-system

# Remove the existing git history
rm -rf .git

# Initialize new git repository
git init
git add .
git commit -m "Initial commit - forked from inventory app v1.0

Base features inherited:
- Asset and asset type management
- QR code scanning workflow
- Mobile PIN authentication
- Dynamic form system with file uploads
- Supabase integration
- Firebase hosting setup

Next: Convert to inspection management system"
```

### **Step 2: Create New GitHub Repository**

**Manual Steps (via GitHub web interface):**
1. Go to https://github.com/new
2. Repository name: `inspection-management-system`
3. Description: `Equipment inspection management system with QR code scanning, mobile workflows, and comprehensive audit trails.`
4. Set as Public or Private (your choice)
5. **Do NOT initialize with README, .gitignore, or license** (we already have these)
6. Click "Create repository"

**Connect local repo to new GitHub repo:**
```bash
# Add the new remote origin
git remote add origin https://github.com/your-username/inspection-management-system.git

# Push to new repository
git push -u origin main

# Verify it worked
git remote -v
```

### **Step 3: Setup New Supabase Project**

**Create New Supabase Project:**
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. **Organization**: Select your organization
4. **Name**: `Inspection Management System`
5. **Database Password**: Generate strong password and save securely
6. **Region**: Choose same region as original project for consistency
7. **Pricing Plan**: Choose appropriate plan
8. Click "Create new project"

**Wait for project initialization (2-3 minutes)**

### **Step 4: Update Environment Configuration**

```bash
# Copy the current .env file as reference
cp .env .env.inventory-backup

# Update .env with new Supabase project details
# Get these from your new Supabase project settings
VITE_SUPABASE_URL=https://your-new-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-new-anon-key-here

# Update firebase.json if changing Firebase project (optional)
# For now, can keep same Firebase project or create new one
```

### **Step 5: Update Project Metadata**

```bash
# Update package.json
npm pkg set name=inspection-management-system
npm pkg set description="Equipment inspection management system with mobile QR workflows"
npm pkg set keywords='["inspection", "equipment", "QR-codes", "mobile", "maintenance"]'
npm pkg set repository.url="git+https://github.com/your-username/inspection-management-system.git"
npm pkg set bugs.url="https://github.com/your-username/inspection-management-system/issues"
npm pkg set homepage="https://github.com/your-username/inspection-management-system#readme"

# Update README.md title and description
sed -i '1s/.*/# Inspection Management System/' README.md
```

### **Step 6: Initial Verification**

```bash
# Install dependencies to verify everything works
npm install

# Run the development server
npm run dev

# Open browser to http://localhost:5173
# Should see the current inventory app (not yet converted)
```

---

## 🔄 **Database Migration Preparation**

### **Export Current Database Schema (Reference Only)**

**From original Supabase project:**
```sql
-- Run this in original project's SQL editor to get current schema
SELECT 
  schemaname,
  tablename,
  tableowner 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Export RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### **Prepare New Database (Before Conversion)**

**In new Supabase project, run:**
```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create initial organization for testing
INSERT INTO organizations (id, name, description)
VALUES (gen_random_uuid(), 'Test Inspection Company', 'Initial organization for testing');
```

---

## ✅ **Verification Checklist**

### **Original Project Backup**
- [ ] All changes committed to git
- [ ] Tagged with version `v1.0-inventory-final`
- [ ] Pushed to GitHub with tags
- [ ] Environment documented
- [ ] Dependencies documented

### **New Project Setup**
- [ ] New git repository created locally
- [ ] New GitHub repository created
- [ ] Local repo connected to GitHub
- [ ] New Supabase project created
- [ ] Environment variables updated
- [ ] Package.json metadata updated
- [ ] Development server runs successfully

### **Ready for Conversion**
- [ ] Both projects accessible and working
- [ ] Clear separation between original and new project
- [ ] New database ready for migration
- [ ] Documentation in place for conversion process

---

## 🚨 **Important Notes**

1. **Keep Original App**: Do NOT delete or modify the original inventory app until inspection app is fully deployed and tested.

2. **Environment Isolation**: The new inspection app will use completely separate:
   - GitHub repository
   - Supabase project  
   - Firebase project (optional)
   - Environment variables

3. **Database Migration**: We will NOT migrate data from inventory to inspection app. Each will maintain separate databases.

4. **Backup Strategy**: Original inventory app remains fully functional as backup and reference.

---

## 🎯 **Next Steps After Setup**

Once this backup and setup is complete, you can proceed with:
1. **Phase 1** of the conversion roadmap (Security hardening)
2. Database schema conversion
3. Component conversion to inspection focus
4. Enhanced form builder for inspection needs

**The original inventory app remains untouched and fully functional throughout this process.**
