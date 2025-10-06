import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button } from 'react-native';
import Constants from 'expo-constants';

const { wsOrigin } = Constants.expoConfig?.extra as { wsOrigin: string };

export default function RoomScreen() {
  const socketRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const socket = new WebSocket(wsOrigin);
    socketRef.current = socket;
    socket.onmessage = (event) => {
      setMessages((prev) => [...prev, event.data.toString()]);
    };
    return () => socket.close();
  }, []);

  const sendVote = () => {
    socketRef.current?.send(
      JSON.stringify({ type: 'room.vote', roomId: 'demo', choiceId: 'continue', beatIdx: 0 })
    );
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 20, marginBottom: 16 }}>Room events</Text>
      <Button title="Cast Vote" onPress={sendVote} />
      {messages.map((msg, idx) => (
        <Text key={idx}>{msg}</Text>
      ))}
    </View>
  );
}
