/**
 * Share Handler - Receives shared content from other apps
 * Handles both Android intents and iOS share extensions
 */

import { useEffect, useRef } from 'react';
import { AppState, Platform, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { useRouter } from 'expo-router';

export function useSharedContent(onContentReceived: (uri: string, type: 'image' | 'video') => void) {
  const router = useRouter();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Check for initial shared content when app launches
    checkForSharedContent();

    // Listen for app state changes (when app comes back from background)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground - check for shared content
        checkForSharedContent();
      }
      appState.current = nextAppState;
    });

    // Listen for deep links
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
      linkingSubscription.remove();
    };
  }, []);

  const checkForSharedContent = async () => {
    try {
      if (Platform.OS === 'android') {
        // Get the Android intent that launched/resumed the app
        const intent = await IntentLauncher.getInitialURL();
        
        if (intent) {
          console.log('Received intent:', intent);
          
          // Parse the shared content URI
          const uri = await parseAndroidIntent(intent);
          if (uri) {
            const type = uri.includes('video') ? 'video' : 'image';
            onContentReceived(uri, type);
          }
        }
      } else if (Platform.OS === 'ios') {
        // iOS uses URL schemes and deep links
        const url = await Linking.getInitialURL();
        if (url) {
          handleDeepLink({ url });
        }
      }
    } catch (error) {
      console.error('Error checking for shared content:', error);
    }
  };

  const parseAndroidIntent = async (intentUrl: string): Promise<string | null> => {
    try {
      if (Platform.OS !== 'android') return null;
      
      // Android intent URLs contain the shared content URI
      // Format: intent://path#Intent;scheme=...;end
      
      // Try to extract the content URI from the intent
      const uriMatch = intentUrl.match(/content:\/\/[^\s#&]+/);
      if (uriMatch) {
        return uriMatch[0];
      }
      
      // Try to extract file:// URIs
      const fileMatch = intentUrl.match(/file:\/\/[^\s#&]+/);
      if (fileMatch) {
        return fileMatch[0];
      }
      
      console.log('Could not parse content URI from intent:', intentUrl);
      return null;
    } catch (error) {
      console.error('Error parsing Android intent:', error);
      return null;
    }
  };

  const handleDeepLink = ({ url }: { url: string }) => {
    console.log('Deep link received:', url);
    
    // Handle toktrip:// URLs
    if (url.startsWith('toktrip://')) {
      const route = url.replace('toktrip://', '');
      
      if (route.startsWith('share')) {
        // Parse shared content from URL params
        const params = new URLSearchParams(route.split('?')[1]);
        const contentUri = params.get('uri');
        const type = params.get('type') as 'image' | 'video' | null;
        
        if (contentUri && type) {
          onContentReceived(decodeURIComponent(contentUri), type);
        }
      }
    }
  };
}

