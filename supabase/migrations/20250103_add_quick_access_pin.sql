-- Add quick_access_pin column to profiles table for mobile QR workflow
-- This enables users to set a 4-digit PIN for mobile asset scanning

-- Add quick_access_pin column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS quick_access_pin VARCHAR(4) CHECK (quick_access_pin ~ '^[0-9]{4}$');

-- Add index for quick PIN lookups
CREATE INDEX IF NOT EXISTS idx_profiles_quick_access_pin 
ON public.profiles(quick_access_pin) 
WHERE quick_access_pin IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.quick_access_pin IS 'Optional 4-digit PIN for mobile QR code scanning authentication';

-- Ensure RLS policies work with PIN authentication
-- (Existing policies should already cover this, but let's make sure)

-- Log the migration
INSERT INTO system_logs (type, message, details)
VALUES (
  'migration',
  'Added quick_access_pin support for mobile QR workflow',
  jsonb_build_object(
    'table', 'profiles',
    'column', 'quick_access_pin',
    'feature', 'mobile_qr_authentication'
  )
); 