import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DemoScreen from './screens/Demo';
import PlayerScreen from './screens/Player';
import ReplayScreen from './screens/Replay';
import RoomScreen from './screens/Room';
import AdminScreen from './screens/Admin';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Demo">
        <Stack.Screen name="Demo" component={DemoScreen} />
        <Stack.Screen name="Player" component={PlayerScreen} />
        <Stack.Screen name="Replay" component={ReplayScreen} />
        <Stack.Screen name="Room" component={RoomScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
