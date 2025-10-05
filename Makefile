.PHONY: supabase.up supabase.down supabase.mig seed dev openapi.gen e2e

supabase.up:
cd supabase && supabase start

supabase.down:
cd supabase && supabase stop

supabase.mig:
supabase migration up --db-url $$SUPABASE_DB_URL --schema public

seed:
supabase db execute --file supabase/seed/seed.sql

dev:
pnpm dev

openapi.gen:
pnpm --filter sdk generate

e2e:
pnpm --filter apps/api test:e2e
