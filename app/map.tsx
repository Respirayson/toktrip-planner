/**
 * Map Screen - Display all travel locations on a map
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Alert,
  Share,
} from 'react-native';
import * as Linking from 'expo-linking';
import { supabase, Place } from '../src/config/supabase';

const { width } = Dimensions.get('window');

export default function MapScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  useEffect(() => {
    // Get current user (or demo user for MVP)
    const userId = 'demo-user';

    // Fetch places from Supabase
    const fetchPlaces = async () => {
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching places:', error);
        setLoading(false);
        return;
      }

      const formattedPlaces: Place[] = data.map((place) => ({
        ...place,
        timestamp: new Date(place.created_at),
      }));

      setPlaces(formattedPlaces);
      setLoading(false);
      console.log(`Loaded ${formattedPlaces.length} places`);
    };

    // Initial fetch
    fetchPlaces();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('places-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'places',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Real-time update:', payload);
          fetchPlaces(); // Re-fetch on any change
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Calculate map region to show all markers
  const getMapRegion = () => {
    if (places.length === 0) {
      // Default to world view
      return {
        latitude: 20,
        longitude: 0,
        latitudeDelta: 80,
        longitudeDelta: 80,
      };
    }

    // Filter places with valid coordinates
    const validPlaces = places.filter(
      (place) => place.latitude !== undefined && place.longitude !== undefined
    );

    if (validPlaces.length === 0) {
      return {
        latitude: 20,
        longitude: 0,
        latitudeDelta: 80,
        longitudeDelta: 80,
      };
    }

    // Calculate bounds
    const latitudes = validPlaces.map((p) => p.latitude!);
    const longitudes = validPlaces.map((p) => p.longitude!);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDelta = (maxLat - minLat) * 1.5 || 0.5;
    const lngDelta = (maxLng - minLng) * 1.5 || 0.5;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Food':
        return '#ef4444';
      case 'Activity':
        return '#3b82f6';
      case 'Stay':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'Food':
        return '🍴';
      case 'Activity':
        return '🎯';
      case 'Stay':
        return '🏨';
      default:
        return '📍';
    }
  };

  // Open single place in Google Maps
  const openInGoogleMaps = async (place: Place) => {
    // Build search query: place name + address for best Google Maps results
    const searchParts = [
      place.place_name,
      place.address_search_query,
    ].filter(Boolean);
    
    if (searchParts.length === 0) {
      Alert.alert('Error', 'No location data available for this place');
      return;
    }
    
    const searchQuery = searchParts.join(', ');
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to open Google Maps');
    }
  };

  // Show export options menu
  const showExportOptions = () => {
    const validPlaces = places.filter(p => p.latitude && p.longitude && p.place_name);
    
    if (validPlaces.length === 0) {
      Alert.alert(
        'No Places to Export',
        'You need places with coordinates to export. Make sure your places have been processed successfully.'
      );
      return;
    }

    Alert.alert(
      '📤 Export Places',
      `Export ${validPlaces.length} places to Google Maps`,
      [
        {
          text: '📋 Copy as Text List',
          onPress: () => shareAsTextList(validPlaces),
        },
        {
          text: '🔗 Copy Google Maps Links',
          onPress: () => shareAsLinks(validPlaces),
        },
        {
          text: '🗺️ Open All as Route',
          onPress: () => shareAsGoogleMapsLink(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // Share as a simple text list (easiest to copy/use)
  const shareAsTextList = async (placesToShare: Place[]) => {
    const textList = placesToShare.map((place, index) => {
      const lines = [
        `${index + 1}. ${place.place_name}`,
        `   📍 ${place.address_search_query || 'No address'}`,
        `   🏷️ ${place.category || 'Uncategorized'}`,
      ];
      if (place.latitude && place.longitude) {
        lines.push(`   🌐 ${place.latitude.toFixed(6)}, ${place.longitude.toFixed(6)}`);
      }
      return lines.join('\n');
    }).join('\n\n');

    const message = `🗺️ My TokTrip Places\n${'─'.repeat(20)}\n\n${textList}\n\n${'─'.repeat(20)}\nExported from TokTrip Planner`;

    try {
      await Share.share({
        title: 'My TokTrip Places',
        message: message,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // Share as Google Maps links (can open each to save to list)
  const shareAsLinks = async (placesToShare: Place[]) => {
    const links = placesToShare.map((place, index) => {
      // Build search query: place name + address for best Google Maps results
      const searchParts = [
        place.place_name,
        place.address_search_query,
      ].filter(Boolean);
      
      const searchQuery = searchParts.join(', ');
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;
      
      return `${index + 1}. ${place.place_name}\n   ${url}`;
    }).join('\n\n');

    const message = `🗺️ My TokTrip Places (Google Maps Links)\n${'─'.repeat(30)}\n\n${links}\n\n${'─'.repeat(30)}\n💡 Tip: Open each link in Google Maps, then tap "Save" to add to your list!`;

    try {
      await Share.share({
        title: 'My TokTrip Places - Google Maps Links',
        message: message,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // Generate a shareable Google Maps list link
  // Helper to build search query for a place
  const buildSearchQuery = (place: Place): string => {
    const parts = [place.place_name, place.address_search_query].filter(Boolean);
    return parts.join(', ');
  };

  const shareAsGoogleMapsLink = async () => {
    const validPlaces = places.filter(p => p.place_name);
    
    if (validPlaces.length === 0) {
      Alert.alert('No Places', 'No places to share.');
      return;
    }

    // Create a multi-destination Google Maps URL (up to 10 waypoints)
    const destinations = validPlaces.slice(0, 10);
    
    if (destinations.length === 1) {
      // Single place - open directly
      await openInGoogleMaps(destinations[0]);
      return;
    }

    // Build directions URL with multiple waypoints using place names
    const origin = encodeURIComponent(buildSearchQuery(destinations[0]));
    const destination = encodeURIComponent(buildSearchQuery(destinations[destinations.length - 1]));
    const waypoints = destinations.slice(1, -1)
      .map(p => buildSearchQuery(p))
      .join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypoints) {
      url += `&waypoints=${encodeURIComponent(waypoints)}`;
    }

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to open Google Maps');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading your travel map...</Text>
      </View>
    );
  }

  const renderPlaceItem = ({ item }: { item: Place }) => (
    <TouchableOpacity
      style={styles.placeCard}
      onPress={() => setSelectedPlace(selectedPlace?.id === item.id ? null : item)}
      activeOpacity={0.7}
    >
      {/* Category Badge */}
      <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
        <Text style={styles.categoryEmoji}>{getCategoryEmoji(item.category)}</Text>
        <Text style={styles.categoryText}>{item.category || 'Unknown'}</Text>
      </View>

      {/* Status Indicators */}
      {item.status === 'processing' && (
        <View style={styles.processingBadge}>
          <ActivityIndicator size="small" color="#6366f1" />
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      )}
      {item.status === 'failed' && (
        <View style={styles.failedBadge}>
          <Text style={styles.failedText}>❌ Failed</Text>
        </View>
      )}

      {/* Place Name */}
      <Text style={styles.placeName}>
        {item.place_name || 'Processing...'}
      </Text>

      {/* Address */}
      {item.address_search_query && (
        <View style={styles.addressRow}>
          <Text style={styles.addressPin}>📍</Text>
          <Text style={styles.addressText} numberOfLines={2}>
            {item.address_search_query}
          </Text>
        </View>
      )}

      {/* Vibe Keywords */}
      {item.vibe_keywords && item.vibe_keywords.length > 0 && (
        <View style={styles.vibesContainer}>
          {item.vibe_keywords.slice(0, 3).map((keyword, index) => (
            <View key={index} style={styles.vibeTag}>
              <Text style={styles.vibeText}>{keyword}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Date */}
      <View style={styles.dateRow}>
        <Text style={styles.dateIcon}>🕒</Text>
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
      </View>

      {/* Google Maps Button */}
      <TouchableOpacity
        style={styles.googleMapsButton}
        onPress={() => openInGoogleMaps(item)}
        activeOpacity={0.8}
      >
        <Text style={styles.googleMapsIcon}>🗺️</Text>
        <Text style={styles.googleMapsText}>Open in Google Maps</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <View style={styles.gradientBg}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>📍</Text>
        <Text style={styles.headerTitle}>My Places</Text>
        <View style={styles.statsCard}>
          <Text style={styles.statsNumber}>{places.length}</Text>
          <Text style={styles.statsLabel}>
            {places.length === 1 ? 'place' : 'places'} discovered
          </Text>
        </View>

        {/* Google Maps Export Buttons */}
        {places.length > 0 && (
          <View style={styles.exportButtonsContainer}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={showExportOptions}
              activeOpacity={0.8}
            >
              <Text style={styles.exportButtonIcon}>📤</Text>
              <Text style={styles.exportButtonText}>Export</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportButton, styles.routeButton]}
              onPress={shareAsGoogleMapsLink}
              activeOpacity={0.8}
            >
              <Text style={styles.exportButtonIcon}>🗺️</Text>
              <Text style={styles.exportButtonText}>View Route</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {places.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✨</Text>
          <Text style={styles.emptyTitle}>Start Your Journey</Text>
          <Text style={styles.emptyText}>
            Upload your first travel memory{'\n'}and watch the magic happen!
          </Text>
        </View>
      ) : (
        <FlatList
          data={places}
          renderItem={renderPlaceItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 1000);
          }}
        />
      )}
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
    width: 350,
    height: 350,
    backgroundColor: '#10b981',
    top: -100,
    right: -80,
  },
  circle2: {
    width: 300,
    height: 300,
    backgroundColor: '#6366f1',
    bottom: 200,
    left: -100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#cbd5e1',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 16,
  },
  statsCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#6366f1',
  },
  statsLabel: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  placeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  processingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  processingText: {
    fontSize: 13,
    color: '#6366f1',
    marginLeft: 8,
    fontWeight: '600',
  },
  failedBadge: {
    marginBottom: 12,
  },
  failedText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },
  placeName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressPin: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  vibesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  vibeTag: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  vibeText: {
    fontSize: 12,
    color: '#a5b4fc',
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Google Maps Button Styles
  googleMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(66, 133, 244, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(66, 133, 244, 0.4)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  googleMapsIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  googleMapsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#60a5fa',
  },
  // Export Buttons Container
  exportButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  routeButton: {
    backgroundColor: 'rgba(66, 133, 244, 0.2)',
    borderColor: 'rgba(66, 133, 244, 0.4)',
  },
  exportButtonIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});


