-- Add color and color_locked columns to family_members and create trigger to auto-assign
ALTER TABLE IF EXISTS public.family_members
ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS color_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- Function to auto-assign a color from a palette when color is missing/empty
CREATE OR REPLACE FUNCTION public.assign_family_member_color()
RETURNS TRIGGER AS $$
DECLARE
  palette TEXT[] := ARRAY[
    '#3B82F6','#F59E0B','#10B981','#EF4444',
    '#8B5CF6','#06B6D4','#E11D48','#84CC16'
  ];
  idx INT;
BEGIN
  IF NEW.color IS NULL OR btrim(NEW.color) = '' THEN
    idx := floor(random() * array_length(palette, 1))::int + 1;
    NEW.color := palette[idx];
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function before insert
DROP TRIGGER IF EXISTS trg_family_member_color ON public.family_members;
CREATE TRIGGER trg_family_member_color
BEFORE INSERT ON public.family_members
FOR EACH ROW
EXECUTE FUNCTION public.assign_family_member_color();

-- Populate existing rows that have empty or NULL color
WITH palette AS (
  SELECT unnest(ARRAY[
    '#3B82F6','#F59E0B','#10B981','#EF4444',
    '#8B5CF6','#06B6D4','#E11D48','#84CC16'
  ]) AS color
)
UPDATE public.family_members
SET color = (
  SELECT color FROM palette ORDER BY random() LIMIT 1
)
WHERE color IS NULL OR btrim(color) = '';
