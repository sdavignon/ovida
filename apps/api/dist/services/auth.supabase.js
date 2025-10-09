const PROFILE_TABLE = 'profiles';
const GOOGLE_PROVIDER = 'google';
const getDisplayName = (user) => {
    const metadata = user.user_metadata ?? {};
    return (metadata.full_name ??
        metadata.name ??
        metadata.display_name ??
        user.email ??
        null);
};
const getAvatarUrl = (user) => {
    const metadata = user.user_metadata ?? {};
    return (metadata.avatar_url ??
        metadata.picture ??
        null);
};
const createProfilePayload = (user) => ({
    user_id: user.id,
    display_name: getDisplayName(user),
    avatar_url: getAvatarUrl(user),
});
export const ensureUserProfile = async ({ supabase, user, logger }) => {
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
        return profile;
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
    return insertedProfile;
};
