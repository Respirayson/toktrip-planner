/**
 * Root Layout for TokTrip Planner
 * Configures Expo Router navigation
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#6366f1',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'TokTrip Planner',
          }}
        />
        <Stack.Screen
          name="upload"
          options={{
            title: 'Upload Video',
          }}
        />
        <Stack.Screen
          name="map"
          options={{
            title: 'My Travel Places',
          }}
        />
        <Stack.Screen
          name="map-view"
          options={{
            title: 'Map View',
          }}
        />
      </Stack>
    </>
  );
}


