import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { apiFetch } from '../api/client';

export default function ReplayScreen({ route }: any) {
  const { runId } = route.params ?? {};
  const [replay, setReplay] = useState<any>(null);

  useEffect(() => {
    apiFetch(`/v1/runs/${runId}/replay`).then(setReplay).catch(console.error);
  }, [runId]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 20, marginBottom: 16 }}>Replay</Text>
      <Text>{JSON.stringify(replay, null, 2)}</Text>
    </View>
  );
}
