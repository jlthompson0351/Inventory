-- Add password requirement system for forcing password changes on first login

-- Create table to track users who need to change their password
CREATE TABLE IF NOT EXISTS public.user_password_requirements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requires_password_change BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_password_requirements ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_password_requirements
CREATE POLICY "Users can view their own password requirements" ON public.user_password_requirements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own password requirements" ON public.user_password_requirements
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to check if current user requires password change
CREATE OR REPLACE FUNCTION public.check_password_change_required()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  requires_change BOOLEAN := FALSE;
BEGIN
  -- Check if user has a password requirement record
  SELECT requires_password_change INTO requires_change
  FROM public.user_password_requirements
  WHERE user_id = auth.uid();
  
  -- If no record exists, user doesn't require password change
  RETURN COALESCE(requires_change, FALSE);
END;
$$;

-- Function to mark password as changed (removes requirement)
CREATE OR REPLACE FUNCTION public.mark_password_changed()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update or insert record to mark password as changed
  INSERT INTO public.user_password_requirements (user_id, requires_password_change, updated_at)
  VALUES (auth.uid(), FALSE, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    requires_password_change = FALSE,
    updated_at = now();
END;
$$;

-- Function to mark a user as requiring password change (admin function)
CREATE OR REPLACE FUNCTION public.mark_user_password_change_required(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if current user is an admin in any organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can mark users as requiring password changes';
  END IF;

  -- Insert or update record to mark user as requiring password change
  INSERT INTO public.user_password_requirements (user_id, requires_password_change, updated_at)
  VALUES (target_user_id, TRUE, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    requires_password_change = TRUE,
    updated_at = now();
END;
$$;

-- Function to automatically mark newly created users as requiring password change
-- This will be called when users are created via admin functions
CREATE OR REPLACE FUNCTION public.handle_new_user_password_requirement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only apply to users created with temp passwords (via admin)
  -- We'll identify these by checking if they have user_metadata.created_by_admin
  IF NEW.raw_user_meta_data->>'created_by_admin' = 'true' THEN
    INSERT INTO public.user_password_requirements (user_id, requires_password_change)
    VALUES (NEW.id, TRUE);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically handle new user password requirements
CREATE OR REPLACE TRIGGER on_auth_user_created_password_requirement
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_password_requirement();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_password_requirements TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_password_change_required() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_password_changed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_user_password_change_required(UUID) TO authenticated; 