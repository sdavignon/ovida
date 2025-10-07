import type { User } from '@supabase/supabase-js';
import type { FastifyBaseLogger } from 'fastify';
import type { createSupabaseServer } from '../supa';

const PROFILE_TABLE = 'profiles';

type SupabaseServerClient = Pick<ReturnType<typeof createSupabaseServer>, 'from'>;

interface EnsureUserProfileOptions {
  supabase: SupabaseServerClient;
  user: User;
  logger?: Pick<FastifyBaseLogger, 'error' | 'warn'>;
}

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role?: string;
  created_at?: string;
}

const GOOGLE_PROVIDER = 'google';

const getDisplayName = (user: User): string | null => {
  const metadata = user.user_metadata ?? {};
  return (
    (metadata.full_name as string | undefined) ??
    (metadata.name as string | undefined) ??
    (metadata.display_name as string | undefined) ??
    user.email ??
    null
  );
};

const getAvatarUrl = (user: User): string | null => {
  const metadata = user.user_metadata ?? {};
  return (
    (metadata.avatar_url as string | undefined) ??
    (metadata.picture as string | undefined) ??
    null
  );
};

const createProfilePayload = (user: User): ProfileRow => ({
  user_id: user.id,
  display_name: getDisplayName(user),
  avatar_url: getAvatarUrl(user),
});

export const ensureUserProfile = async ({ supabase, user, logger }: EnsureUserProfileOptions) => {
  if (!user) {
    return null;
  }

  if (user.app_metadata?.provider !== GOOGLE_PROVIDER) {
    logger?.warn?.({ provider: user.app_metadata?.provider }, 'ensuring profile for non-google provider');
  }

  const { data: profile, error: profileError } = await supabase
    .from(PROFILE_TABLE)
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    logger?.error?.({ err: profileError, userId: user.id }, 'failed to load user profile');
    throw new Error('failed to load user profile');
  }

  if (profile) {
    return profile as ProfileRow;
  }

  const payload = createProfilePayload(user);
  const { data: insertedProfile, error: insertError } = await supabase
    .from(PROFILE_TABLE)
    .insert(payload)
    .select()
    .single();

  if (insertError) {
    logger?.error?.({ err: insertError, userId: user.id }, 'failed to create user profile');
    throw new Error('failed to create user profile');
  }

  return insertedProfile as ProfileRow;
};

export type EnsureUserProfile = typeof ensureUserProfile;
