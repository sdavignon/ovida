import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import { apiFetch } from '../api/client';

type DemoResponse = {
  guest_id: string;
  run_id: string;
  beat: { narration: string };
};

export default function DemoScreen({ navigation }: any) {
  const [state, setState] = useState<DemoResponse | null>(null);

  const startDemo = async () => {
    const response = await apiFetch<DemoResponse>('/v1/demos/start', {
      method: 'POST',
    });
    setState(response);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 24, marginBottom: 16 }}>Ovida Demo</Text>
      {state ? (
        <Text style={{ marginBottom: 16 }}>{state.beat.narration}</Text>
      ) : (
        <Text style={{ marginBottom: 16 }}>Start the 3-step haunted shore demo.</Text>
      )}
      <Button title="Start Demo" onPress={startDemo} />
      {state && (
        <Button
          title="Go to Player"
          onPress={() => navigation.navigate('Player', { runId: state.run_id })}
        />
      )}
      <View style={{ marginTop: 24 }}>
        <Text style={{ fontSize: 16, marginBottom: 8 }}>Operator tools</Text>
        <Button title="Open Admin Console" onPress={() => navigation.navigate('Admin')} />
      </View>
    </View>
  );
}
