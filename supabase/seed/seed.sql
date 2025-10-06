insert into public.stories (id, title, canon_version, policy_version)
values
  ('haunted-shore', 'Haunted Shore', 'v1', 'policy-v1')
on conflict (id) do nothing;
