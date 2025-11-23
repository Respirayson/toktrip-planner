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

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
}

export default function UploadScreen() {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);

  // Handle shared content from other apps
  useSharedContent((uri, type) => {
    console.log('Received shared content:', uri, type);
    const newMedia: MediaItem = { uri, type };
    setSelectedMedia([newMedia]);
    
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
          const newMedia: MediaItem = { 
            uri: decodeURIComponent(contentUri), 
            type 
          };
          setSelectedMedia([newMedia]);
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

  const pickMedia = async (allowMultiple: boolean = true) => {
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

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: allowMultiple,
        quality: 1,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets.length > 0) {
        const mediaItems: MediaItem[] = result.assets.map(asset => ({
          uri: asset.uri,
          type: (asset.type === 'video' ? 'video' : 'image') as 'image' | 'video'
        }));
        
        setSelectedMedia(mediaItems);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media. Please try again.');
    }
  };

  const uploadMedia = async () => {
    if (selectedMedia.length === 0) {
      Alert.alert('No Media', 'Please select photos or videos first.');
      return;
    }

    const userId = 'demo-user';
    setUploading(true);
    setCurrentUploadIndex(0);

    try {
      const totalFiles = selectedMedia.length;
      let successCount = 0;

      for (let i = 0; i < selectedMedia.length; i++) {
        const media = selectedMedia[i];
        setCurrentUploadIndex(i + 1);
        
        const timestamp = Date.now() + i; // Unique timestamp for each
        const fileExt = media.type === 'image' ? 'jpg' : 'mp4';
        const contentType = media.type === 'image' ? 'image/jpeg' : 'video/mp4';
        const fileName = `${timestamp}.${fileExt}`;
        const storagePath = `uploads/${userId}/${fileName}`;

        try {
          // Update progress for this file
          const baseProgress = (i / totalFiles) * 100;
          setUploadProgress(baseProgress);

          // Fetch the media file
          const response = await fetch(media.uri);
          const arrayBuffer = await response.arrayBuffer();
          
          // Convert to base64
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
            console.error(`Error uploading file ${i + 1}:`, uploadError);
            continue;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('videos')
            .getPublicUrl(storagePath);

          const mediaUrl = urlData.publicUrl;

          // Create database record
          const { error: dbError } = await supabase
            .from('places')
            .insert({
              user_id: userId,
              video_url: mediaUrl,
              video_path: storagePath,
              status: 'processing',
            });

          if (!dbError) {
            successCount++;
          }

          // Update progress
          const fileProgress = ((i + 1) / totalFiles) * 100;
          setUploadProgress(fileProgress);

        } catch (fileError) {
          console.error(`Error processing file ${i + 1}:`, fileError);
        }
      }

      setUploadProgress(100);
      setUploading(false);
      
      Alert.alert(
        'Upload Complete! 🎉',
        `Successfully uploaded ${successCount} of ${totalFiles} ${totalFiles === 1 ? 'file' : 'files'}. AI is processing them now!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedMedia([]);
              setCurrentUploadIndex(0);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error uploading media:', error);
      setUploading(false);
      Alert.alert('Error', error.message || 'Failed to upload media. Please try again.');
    }
  };

  const removeMedia = (index: number) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <View style={styles.gradientBg}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Upload Your Memory</Text>
          <Text style={styles.description}>
            Share a travel photo or video and let AI discover the magic ✨
          </Text>
        </View>

        {selectedMedia.length > 0 ? (
          <View style={styles.mediaCard}>
            {/* Media Grid */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.mediaScrollView}
            >
              {selectedMedia.map((media, index) => (
                <View key={index} style={styles.mediaItemContainer}>
                  <View style={styles.mediaPreview}>
                    {media.type === 'video' ? (
                      <Video
                        source={{ uri: media.uri }}
                        style={styles.mediaThumbnail}
                        useNativeControls
                        resizeMode="cover"
                      />
                    ) : (
                      <Image
                        source={{ uri: media.uri }}
                        style={styles.mediaThumbnail}
                        resizeMode="cover"
                      />
                    )}
                  </View>
                  
                  {/* Remove button */}
                  {!uploading && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeMedia(index)}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  )}
                  
                  {/* Type badge */}
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>
                      {media.type === 'video' ? '🎬' : '📷'}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            
            {/* Action buttons */}
            {!uploading && (
              <View style={styles.mediaActions}>
                <TouchableOpacity
                  style={styles.addMoreButton}
                  onPress={() => pickMedia(true)}
                >
                  <Text style={styles.addMoreIcon}>+</Text>
                  <Text style={styles.addMoreText}>Add More</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSelectedMedia([])}
                >
                  <Text style={styles.clearText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Count badge */}
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {selectedMedia.length} {selectedMedia.length === 1 ? 'file' : 'files'} selected
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.selectCard}
            onPress={() => pickMedia(true)}
            activeOpacity={0.8}
          >
            <View style={styles.selectIconContainer}>
              <Text style={styles.selectIcon}>📸</Text>
              <Text style={styles.selectIconPlus}>+</Text>
            </View>
            <Text style={styles.selectTitle}>Choose Media</Text>
            <Text style={styles.selectSubtitle}>Select multiple photos or videos</Text>
          </TouchableOpacity>
        )}

        {uploading && (
          <View style={styles.progressCard}>
            <View style={styles.progressIconContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
            </View>
            <Text style={styles.progressTitle}>Uploading Magic ✨</Text>
            <Text style={styles.progressCount}>
              {currentUploadIndex} / {selectedMedia.length}
            </Text>
            <Text style={styles.progressText}>{uploadProgress.toFixed(0)}%</Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${uploadProgress}%` },
                ]}
              />
            </View>
            <Text style={styles.progressSubtext}>
              AI is analyzing your content...
            </Text>
          </View>
        )}

        {selectedMedia.length > 0 && !uploading && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={uploadMedia}
            activeOpacity={0.9}
          >
            <Text style={styles.uploadButtonIcon}>🚀</Text>
            <Text style={styles.uploadButtonText}>
              Upload {selectedMedia.length} {selectedMedia.length === 1 ? 'File' : 'Files'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>✨ Pro Tips</Text>
          <View style={styles.tipsList}>
            <TipItem icon="📸" text="Photos & videos both work great" />
            <TipItem icon="⏱️" text="Keep videos under 60 seconds" />
            <TipItem icon="🏛️" text="Show clear landmarks for best results" />
            <TipItem icon="🤖" text="AI processes in ~10-30 seconds" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function TipItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.tipItem}>
      <Text style={styles.tipIcon}>{icon}</Text>
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  gradientBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 500,
    opacity: 0.15,
  },
  circle1: {
    width: 400,
    height: 400,
    backgroundColor: '#6366f1',
    top: -150,
    right: -100,
  },
  circle2: {
    width: 300,
    height: 300,
    backgroundColor: '#ec4899',
    bottom: 100,
    left: -80,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#cbd5e1',
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  mediaCard: {
    marginBottom: 24,
  },
  mediaScrollView: {
    marginBottom: 16,
  },
  mediaItemContainer: {
    marginRight: 12,
    position: 'relative',
  },
  mediaPreview: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  mediaThumbnail: {
    width: 200,
    height: 280,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  removeButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  typeBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 16,
  },
  mediaActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  addMoreButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    borderStyle: 'dashed',
  },
  addMoreIcon: {
    fontSize: 24,
    marginRight: 8,
    color: '#6366f1',
  },
  addMoreText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '700',
  },
  clearButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
  },
  clearText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  countText: {
    color: '#a5b4fc',
    fontSize: 14,
    fontWeight: '700',
  },
  changeButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  changeButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  changeButtonText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
  },
  selectCard: {
    padding: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  selectIconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  selectIcon: {
    fontSize: 80,
  },
  selectIconPlus: {
    position: 'absolute',
    fontSize: 32,
    bottom: -10,
    right: -10,
    backgroundColor: '#6366f1',
    borderRadius: 20,
    width: 40,
    height: 40,
    textAlign: 'center',
    lineHeight: 40,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  selectTitle: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '800',
    marginBottom: 6,
  },
  selectSubtitle: {
    fontSize: 15,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  progressCard: {
    padding: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressIconContainer: {
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: '800',
    marginBottom: 8,
  },
  progressCount: {
    fontSize: 16,
    color: '#cbd5e1',
    fontWeight: '600',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 40,
    color: '#6366f1',
    fontWeight: '900',
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 6,
  },
  progressSubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#6366f1',
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  uploadButtonIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  tipsCard: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tipsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 16,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 32,
  },
  tipText: {
    fontSize: 15,
    color: '#cbd5e1',
    lineHeight: 22,
    flex: 1,
  },
});

