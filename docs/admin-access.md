# Assigning Admin Access

Admin-only flows rely on the role stored on each profile. Roles live on the `public.profiles`
record that is created for every authenticated Supabase user. By default a new profile is assigned the `user`
role and can only update its own profile while keeping that role.

To promote someone to an admin:

1. Open the Supabase SQL editor (or run the command via `psql` with the service role key).
2. Execute the following statement, substituting the target user's UUID from `auth.users`:

```sql
update public.profiles
set role = 'admin'
where user_id = '00000000-0000-0000-0000-000000000000';
```

Because the policy on `public.profiles` only allows regular users to persist the `user` role, you must run the
update with the service role (Supabase dashboard, server migration, or `SUPABASE_SERVICE_ROLE_KEY`). Service
role access bypasses row level security so the change succeeds even though the row transitions to `admin`.

You can demote an operator the same way, swapping `'admin'` for `'producer'`, `'moderator'`, `'analyst'`, or back
to `'user'` as needed.
