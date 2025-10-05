import React from 'react';
import { View, Text } from 'react-native';

type Props = {
  choices: { id: string; text: string }[];
};

export const VoteBar: React.FC<Props> = ({ choices }) => {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 12 }}>
      {choices.map((choice) => (
        <View key={choice.id} style={{ padding: 8 }}>
          <Text>{choice.text}</Text>
        </View>
      ))}
    </View>
  );
};
