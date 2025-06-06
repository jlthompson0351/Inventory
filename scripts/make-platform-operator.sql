-- Script to make a user a platform operator
-- Replace 'your-email@example.com' with your actual email address

-- Step 1: Find your user ID
-- Run this first to get your user ID:
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Step 2: Add yourself as a platform operator
-- Replace 'YOUR_USER_ID_HERE' with the ID from step 1
INSERT INTO platform_operators (user_id) 
VALUES ('YOUR_USER_ID_HERE')
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Verify the insertion
SELECT po.user_id, au.email 
FROM platform_operators po 
JOIN auth.users au ON po.user_id = au.id 
WHERE au.email = 'your-email@example.com'; 