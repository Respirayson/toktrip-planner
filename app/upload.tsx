/**
 * Upload Screen - Video/Photo selection and upload to Supabase Storage
 * Supports direct sharing from other apps like TikTok, Instagram, etc.
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { Video } from 'expo-av';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../src/config/supabase';
import { VideoUpload } from '../src/types';
import { useSharedContent } from './share-handler';

export default function UploadScreen() {
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('video');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Handle shared content from other apps
  useSharedContent((uri, type) => {
    console.log('Received shared content:', uri, type);
    setSelectedMedia(uri);
    setMediaType(type);
    
    // Show alert asking if user wants to auto-upload
    Alert.alert(
      'Content Received! 📥',
      `Would you like to upload this ${type === 'video' ? 'video' : 'photo'} now?`,
      [
        {
          text: 'Not Now',
          style: 'cancel',
        },
        {
          text: 'Upload',
          onPress: () => {
            // Auto-upload after a brief delay
            setTimeout(() => uploadMedia(), 500);
          },
        },
      ]
    );
  });

  // Listen for app reopening (Android intent handling)
  useEffect(() => {
    const handleUrl = async (event: { url: string }) => {
      console.log('URL received:', event.url);
      // Handle custom URL scheme
      if (event.url.startsWith('toktrip://')) {
        // Parse shared content
        const params = new URLSearchParams(event.url.split('?')[1]);
        const contentUri = params.get('uri');
        const type = params.get('type') as 'image' | 'video' | null;
        
        if (contentUri && type) {
          setSelectedMedia(decodeURIComponent(contentUri));
          setMediaType(type);
        }
      }
    };

    // Check for initial URL when app launches
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl({ url });
      }
    });

    // Listen for URLs while app is running
    const subscription = Linking.addEventListener('url', handleUrl);

    return () => {
      subscription.remove();
    };
  }, []);

  const pickMedia = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your media library.'
        );
        return;
      }

      // Launch image picker for photos and videos
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // Accept both images and videos
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 60, // 60 seconds max for videos
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedMedia(asset.uri);
        setMediaType(asset.type || 'video');
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media. Please try again.');
    }
  };

  const uploadMedia = async () => {
    if (!selectedMedia) {
      Alert.alert('No Media', 'Please select a photo or video first.');
      return;
    }

    // For MVP, we'll use a demo user ID
    // In production, implement proper authentication with Supabase Auth
    const userId = 'demo-user';
    const timestamp = Date.now();
    
    // Determine file extension and content type
    const fileExt = mediaType === 'image' ? 'jpg' : 'mp4';
    const contentType = mediaType === 'image' ? 'image/jpeg' : 'video/mp4';
    const fileName = `${timestamp}.${fileExt}`;
    const storagePath = `uploads/${userId}/${fileName}`;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Fetch the media file
      const response = await fetch(selectedMedia);
      const arrayBuffer = await response.arrayBuffer();
      
      // Convert to base64 for Supabase
      const base64Data = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(storagePath, decode(base64Data), {
          contentType: contentType,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(storagePath);

      const mediaUrl = urlData.publicUrl;

      console.log(`${mediaType === 'image' ? 'Photo' : 'Video'} uploaded to Supabase:`, mediaUrl);

      // Create database record to trigger processing
      const { data: placeData, error: dbError } = await supabase
        .from('places')
        .insert({
          user_id: userId,
          video_url: mediaUrl,
          video_path: storagePath,
          status: 'processing',
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      console.log('Place record created:', placeData.id);

      setUploadProgress(100);
      setUploading(false);
      
      Alert.alert(
        'Upload Successful! 🎉',
        `Your ${mediaType} is being processed. Check the map in a few moments to see your location!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedMedia(null);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error(`Error uploading ${mediaType}:`, error);
      setUploading(false);
      Alert.alert('Error', error.message || `Failed to upload ${mediaType}. Please try again.`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Upload Travel Photo/Video</Text>
        <Text style={styles.description}>
          Select a photo or video from your gallery. Our AI will automatically extract the
          location and add it to your map! 🤖
        </Text>
      </View>

      {selectedMedia ? (
        <View style={styles.videoContainer}>
          {mediaType === 'video' ? (
            <Video
              source={{ uri: selectedMedia }}
              style={styles.video}
              useNativeControls
              resizeMode="contain"
              isLooping
            />
          ) : (
            <Image
              source={{ uri: selectedMedia }}
              style={styles.video}
              resizeMode="contain"
            />
          )}
          
          {!uploading && (
            <TouchableOpacity
              style={styles.changeButton}
              onPress={pickMedia}
            >
              <Text style={styles.changeButtonText}>Change {mediaType === 'video' ? 'Video' : 'Photo'}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={styles.selectButton}
          onPress={pickMedia}
        >
          <Text style={styles.selectButtonIcon}>📸🎬</Text>
          <Text style={styles.selectButtonText}>Select Photo or Video</Text>
        </TouchableOpacity>
      )}

      {uploading && (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.progressText}>
            Uploading: {uploadProgress.toFixed(0)}%
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${uploadProgress}%` },
              ]}
            />
          </View>
        </View>
      )}

      {selectedMedia && !uploading && (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={uploadMedia}
        >
          <Text style={styles.uploadButtonText}>🚀 Upload {mediaType === 'video' ? 'Video' : 'Photo'}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>💡 Tips:</Text>
        <Text style={styles.infoText}>• Photos or videos both work!</Text>
        <Text style={styles.infoText}>• Keep videos under 60 seconds</Text>
        <Text style={styles.infoText}>• Show landmarks or recognizable locations</Text>
        <Text style={styles.infoText}>• Clear views get better results</Text>
        <Text style={styles.infoText}>• Processing takes ~10-30 seconds</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  videoContainer: {
    marginBottom: 20,
  },
  video: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  changeButton: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  changeButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  selectButton: {
    padding: 60,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  selectButtonIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  selectButtonText: {
    fontSize: 18,
    color: '#6366f1',
    fontWeight: '600',
  },
  progressContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  progressText: {
    fontSize: 16,
    color: '#475569',
    marginTop: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  uploadButton: {
    padding: 20,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoBox: {
    padding: 20,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
    lineHeight: 20,
  },
});

