import React from 'react';
import { supabase } from '../supa';
import { Button } from 'react-native';

export const GoogleWebButton = () => {
  const signIn = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return <Button title="Sign in with Google" onPress={signIn} />;
};
