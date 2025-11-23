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
} from 'react-native';
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
      style={styles.placeItem}
      onPress={() => setSelectedPlace(selectedPlace?.id === item.id ? null : item)}
    >
      <View style={styles.placeItemHeader}>
        <Text style={styles.placeItemCategory}>
          {getCategoryEmoji(item.category)} {item.category || 'Unknown'}
        </Text>
        {item.status === 'processing' && (
          <ActivityIndicator size="small" color="#6366f1" />
        )}
        {item.status === 'failed' && (
          <Text style={styles.statusBadge}>❌ Failed</Text>
        )}
      </View>
      
      <Text style={styles.placeItemName}>
        {item.place_name || 'Processing...'}
      </Text>
      
      {item.address_search_query && (
        <Text style={styles.placeItemAddress} numberOfLines={1}>
          📍 {item.address_search_query}
        </Text>
      )}
      
      {item.vibe_keywords && item.vibe_keywords.length > 0 && (
        <View style={styles.keywordsRow}>
          {item.vibe_keywords.slice(0, 3).map((keyword, index) => (
            <View key={index} style={styles.keywordTag}>
              <Text style={styles.keywordText}>{keyword}</Text>
            </View>
          ))}
        </View>
      )}
      
      <Text style={styles.placeItemDate}>
        {new Date(item.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Travel Places</Text>
        <Text style={styles.headerSubtitle}>
          {places.length} {places.length === 1 ? 'place' : 'places'} discovered
        </Text>
      </View>

      {places.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyTitle}>No places yet!</Text>
          <Text style={styles.emptyText}>
            Upload your first travel video to get started.
          </Text>
        </View>
      ) : (
        <FlatList
          data={places}
          renderItem={renderPlaceItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshing={loading}
          onRefresh={() => {
            setLoading(true);
            // The useEffect will re-fetch
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
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    backgroundColor: '#6366f1',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  placeItem: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  placeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  placeItemCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  statusBadge: {
    fontSize: 12,
    color: '#ef4444',
  },
  placeItemName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
  },
  placeItemAddress: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 10,
  },
  keywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  placeItemDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  keywordTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  keywordText: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '500',
  },
  emptyContainer: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
});


