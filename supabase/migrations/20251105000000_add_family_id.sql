-- Add family_id column to profiles table
ALTER TABLE IF EXISTS profiles 
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);

-- Create families table if it doesn't exist
CREATE TABLE IF NOT EXISTS families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create a default family
INSERT INTO families (name) 
VALUES ('My Family')
ON CONFLICT DO NOTHING;

-- Update existing profiles to use the default family
WITH default_family AS (
    SELECT id FROM families LIMIT 1
)
UPDATE profiles
SET family_id = (SELECT id FROM default_family)
WHERE family_id IS NULL;