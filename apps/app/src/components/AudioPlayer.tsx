import React from 'react';
import { View, Text } from 'react-native';

type Props = {
  url: string;
};

export const AudioPlayer: React.FC<Props> = ({ url }) => {
  return (
    <View style={{ padding: 12, borderWidth: 1, borderColor: '#ccc', marginVertical: 12 }}>
      <Text>Audio ready at {url}</Text>
    </View>
  );
};
