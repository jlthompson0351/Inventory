# Mobile QR Code RLS Security Documentation

**Status**: 🚨 **CRITICAL SECURITY REVIEW REQUIRED BEFORE REUSE**

This document provides comprehensive documentation of the Row Level Security (RLS) policies that enable the mobile QR code workflow, the security vulnerabilities identified, and recommended fixes for the inspection app conversion.

---

## 🎯 **Executive Summary**

The mobile QR code workflow allows field users to scan QR codes and perform actions via PIN authentication without full login. However, the current RLS implementation has **CRITICAL SECURITY VULNERABILITIES** that must be fixed before reuse in the inspection app.

**Key Security Issues:**
- Anonymous users can view ANY asset across ALL organizations
- Anonymous users can modify ANY asset across ALL organizations  
- User enumeration attacks possible through PIN lookup
- No organization scoping for anonymous access

---

## 🏗️ **Current Mobile QR Workflow Architecture**

### **User Flow**
1. **Scan QR Code** → `/mobile/asset/:assetId`
2. **Anonymous Asset View** → Display asset info (NO LOGIN REQUIRED)
3. **PIN Authentication** → Enter 4-digit PIN for actions
4. **Form Submission** → Submit forms with inventory/inspection data

### **Technical Components**
- **Frontend**: `MobileAssetWorkflow.tsx`, `QRScanHandler.tsx`
- **Backend**: RLS policies on `assets`, `profiles`, `inventory_history` tables
- **Authentication**: PIN stored in `profiles.quick_access_pin` column
- **Session Management**: Local storage with expiration tokens

---

## 🚨 **Current RLS Policies (INSECURE)**

### **Assets Table - VULNERABLE**

```sql
-- ⚠️ CURRENT POLICY (INSECURE)
CREATE POLICY "Allow anonymous mobile QR access to assets" 
ON public.assets FOR SELECT
TO anon
USING (true);  -- ❌ Allows access to ANY asset in ANY organization

CREATE POLICY "Allow anonymous update to assets for mobile QR" 
ON public.assets FOR UPDATE
TO anon 
USING (true)   -- ❌ Allows updates to ANY asset
WITH CHECK (true);  -- ❌ No validation on updates
```

**Security Risk**: Anonymous users can view and modify assets from any organization by simply knowing asset IDs.

### **Profiles Table - USER ENUMERATION**

```sql
-- ⚠️ CURRENT POLICY (INSECURE) 
CREATE POLICY "Allow anonymous PIN lookup for mobile QR" 
ON public.profiles FOR SELECT
TO anon
USING (true);  -- ❌ Allows enumeration of all users with PINs
```

**Security Risk**: Attackers can enumerate all users with PINs and attempt brute force attacks.

### **Inventory History Table - CROSS-ORG ACCESS**

```sql
-- ⚠️ CURRENT POLICY (INSECURE)
CREATE POLICY "Allow anonymous mobile QR insert to inventory_history" 
ON public.inventory_history FOR INSERT
TO anon
WITH CHECK (true);  -- ❌ Can insert fake data for any organization
```

**Security Risk**: Anonymous users can insert fake inventory/inspection records for any organization.

---

## ✅ **SECURE RLS POLICIES (RECOMMENDED)**

### **Approach 1: QR Session Tokens (Recommended)**

Create a secure session-based system that scopes anonymous access:

```sql
-- 1. Create QR scan sessions table
CREATE TABLE public.qr_scan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  user_id UUID REFERENCES public.profiles(id),  -- Set after PIN auth
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.qr_scan_sessions ENABLE ROW LEVEL SECURITY;

-- 3. QR sessions are accessible to anon with valid token
CREATE POLICY "Anonymous can access valid QR sessions"
ON public.qr_scan_sessions FOR SELECT
TO anon
USING (expires_at > NOW());

-- 4. Secure assets policy - only via valid QR session
CREATE POLICY "Anonymous mobile QR access via session" 
ON public.assets FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.qr_scan_sessions qss 
    WHERE qss.asset_id = assets.id 
    AND qss.expires_at > NOW()
    AND qss.session_token = current_setting('request.jwt.claims', true)::json->>'qr_token'
  )
);

-- 5. Secure PIN lookup - scoped to asset's organization
CREATE POLICY "Anonymous PIN lookup for QR session asset" 
ON public.profiles FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.qr_scan_sessions qss
    JOIN public.assets a ON a.id = qss.asset_id 
    WHERE a.organization_id = profiles.organization_id
    AND qss.expires_at > NOW()
    AND qss.session_token = current_setting('request.jwt.claims', true)::json->>'qr_token'
  )
);

-- 6. Secure inventory history - only authenticated with valid session
CREATE POLICY "Anonymous mobile QR insert with PIN auth" 
ON public.inventory_history FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.qr_scan_sessions qss
    WHERE qss.user_id IS NOT NULL  -- PIN authenticated
    AND qss.expires_at > NOW()
    AND qss.session_token = current_setting('request.jwt.claims', true)::json->>'qr_token'
    AND qss.organization_id = inventory_history.organization_id
  )
);
```

### **Approach 2: Asset-Specific QR Tokens (Simpler)**

```sql
-- 1. Add QR token column to assets (simpler approach)
ALTER TABLE public.assets 
ADD COLUMN qr_access_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN qr_token_expires TIMESTAMP WITH TIME ZONE;

-- 2. Secure assets policy - only with valid QR token
CREATE POLICY "Anonymous mobile QR access with token" 
ON public.assets FOR SELECT
TO anon
USING (
  qr_access_token::text = current_setting('request.jwt.claims', true)::json->>'qr_token'
  AND (qr_token_expires IS NULL OR qr_token_expires > NOW())
);

-- 3. Secure PIN lookup - only for users in same org as QR asset
CREATE POLICY "Anonymous PIN lookup for QR asset org" 
ON public.profiles FOR SELECT
TO anon
USING (
  organization_id IN (
    SELECT organization_id FROM public.assets 
    WHERE qr_access_token::text = current_setting('request.jwt.claims', true)::json->>'qr_token'
    AND (qr_token_expires IS NULL OR qr_token_expires > NOW())
  )
  AND quick_access_pin IS NOT NULL
);
```

---

## 🔧 **Implementation Plan for Inspection App**

### **Phase 1: Security Hardening**
1. **Implement QR Session Tokens** - Choose Approach 1 or 2 above
2. **Update Mobile QR Components** - Modify to use secure tokens
3. **Test Anonymous Access Scoping** - Verify organization isolation
4. **Implement Session Expiration** - Auto-expire QR sessions

### **Phase 2: Inspection App Conversion**
1. **Database Schema Changes**:
   - Rename `inventory_history` → `inspection_history`
   - Change `quantity` fields → `inspection_status`, `condition_rating`
   - Add inspection-specific fields (`pass_fail`, `notes`, `photos`)

2. **Component Updates**:
   - Rename "Inventory Check" → "Inspection"
   - Update form field types for inspection data
   - Enhance photo upload capabilities

3. **Workflow Changes**:
   - Replace stock calculations with inspection results
   - Remove quantity-based logic
   - Add inspection scheduling/reminders

### **Phase 3: Enhanced Form Builder**
1. **Inspection-Specific Field Types**:
   - Pass/Fail toggles
   - Condition ratings (1-5 scale)
   - Photo requirement fields
   - Signature fields for inspectors

2. **Inspection Templates**:
   - Safety inspection templates
   - Equipment maintenance templates
   - Compliance check templates

---

## 🧪 **Testing Security Implementation**

### **Security Tests Required**
1. **Cross-Organization Access Test**:
   - Attempt to access assets from different organizations
   - Should be blocked by RLS policies

2. **PIN Enumeration Test**:
   - Attempt to query all PINs without valid QR session
   - Should return no results

3. **Session Expiration Test**:
   - Test access after QR session expires
   - Should be denied access

4. **Token Validation Test**:
   - Test with invalid/tampered QR tokens
   - Should be denied access

### **Test Scenarios**
```sql
-- Test 1: Anonymous access without QR token (should fail)
SELECT * FROM assets WHERE id = 'any-asset-id';

-- Test 2: PIN lookup without valid session (should fail)
SELECT * FROM profiles WHERE quick_access_pin = '1234';

-- Test 3: Cross-org data insertion (should fail)
INSERT INTO inventory_history (asset_id, organization_id, ...) 
VALUES ('asset-from-org-a', 'org-b-id', ...);
```

---

## 📋 **Migration Checklist**

### **Before Conversion**
- [ ] Backup current RLS policies
- [ ] Document all current mobile QR endpoints
- [ ] Test current functionality thoroughly
- [ ] Export all current data structures

### **During Conversion**
- [ ] Implement secure RLS policies
- [ ] Update mobile QR components
- [ ] Test security implementation
- [ ] Convert database schema for inspections
- [ ] Update all mobile workflows

### **After Conversion**
- [ ] Penetration testing of mobile QR workflow
- [ ] Performance testing with new RLS policies
- [ ] User acceptance testing of inspection workflows
- [ ] Security audit of all anonymous access points

---

## 🚨 **Critical Security Warnings**

1. **DO NOT** reuse the current RLS policies in the inspection app
2. **DO NOT** allow `USING (true)` policies for anonymous access
3. **DO NOT** expose PIN lookup without session validation
4. **DO NOT** skip security testing before production deployment

---

## 📞 **Next Steps**

1. **Choose Security Approach**: Decide between Session Tokens vs Asset Tokens
2. **Implement Secure RLS**: Apply one of the recommended policy sets
3. **Test Security Implementation**: Run all security tests
4. **Document New Architecture**: Update documentation with secure implementation
5. **Begin Inspection App Conversion**: Start with secure foundation

---

**This documentation ensures the inspection app will have a secure mobile QR workflow from day one.**
