import React from 'react';
import { View, Text, Button } from 'react-native';

export default function PlayerScreen({ navigation, route }: any) {
  const { runId } = route.params ?? {};
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 20, marginBottom: 16 }}>Player for run {runId}</Text>
      <Button title="View Replay" onPress={() => navigation.navigate('Replay', { runId })} />
      <Button title="Enter Room" onPress={() => navigation.navigate('Room', { runId })} />
    </View>
  );
}
