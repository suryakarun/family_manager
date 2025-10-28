How to apply the member-color migration and populate deterministic colors

This project added a migration to add `color` to `family_members` and a follow-up migration
(`20251029_populate_family_member_colors.sql`) that assigns deterministic colors for rows
where `color IS NULL`.

You can apply these SQL files in one of two ways:

1) Using the Supabase CLI (recommended when you manage migrations):

   - Install supabase CLI: https://supabase.com/docs/guides/cli
   - Authenticate / login to your Supabase project
   - From the repo root, run:

     supabase db push --db-url <YOUR_DATABASE_URL>

   This will push schema changes/migrations. If you prefer to run a single SQL file you can
   run the SQL directly with psql using the DATABASE_URL.

2) Using the SQL editor in the Supabase dashboard (quick & manual):

   - Open your Supabase project, go to SQL Editor -> New query.
   - Copy the contents of `supabase/migrations/20251028_add_family_member_color.sql` and run it.
   - Then copy & run `supabase/migrations/20251029_populate_family_member_colors.sql`.

Notes:
- The populate script uses `md5(user_id)` (or `id` fallback) to pick a color from a fixed palette.
- Running the populate script is idempotent for rows where `color IS NULL`; it won't overwrite
  rows with existing colors.
- If you'd prefer custom colors, edit the SQL to set specific hex values for particular
  `family_members.id` or run manual UPDATE statements.

Example manual UPDATE (single member):

  UPDATE family_members SET color = '#10b981' WHERE id = '<membership-id>';

If you want me to generate a one-off SQL that assigns specific palette colors per family in a
particular deterministic order (e.g. by joined date), tell me which rule you prefer and I can
create it.
