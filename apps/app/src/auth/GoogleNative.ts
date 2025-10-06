import * as AuthSession from 'expo-auth-session';
import { supabase } from '../supa';

export const signInWithGoogleNative = async () => {
  const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'ovida' });
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    },
  });
};
