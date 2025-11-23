/**
 * Map View Screen - Using OpenStreetMap (100% Free!)
 * No API keys, no credit card required
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase, Place } from '../src/config/supabase';

const { width, height } = Dimensions.get('window');

export default function MapViewScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  useEffect(() => {
    const userId = 'demo-user';

    // Fetch places from Supabase
    const fetchPlaces = async () => {
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching places:', error);
        setLoading(false);
        return;
      }

      setPlaces(data || []);
      setLoading(false);
    };

    fetchPlaces();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('places-map-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'places',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchPlaces();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Generate HTML for Leaflet map
  const generateMapHTML = () => {
    // For demo, use default coordinates if no places with coordinates
    const defaultLat = 20;
    const defaultLng = 0;
    const defaultZoom = 2;

    // Filter places that might have coordinates (future feature)
    const placesWithCoords = places.filter(p => p.latitude && p.longitude);

    // Generate markers JavaScript
    const markers = placesWithCoords.map((place, index) => {
      const category = place.category || 'Unknown';
      const color = category === 'Food' ? 'red' : category === 'Activity' ? 'blue' : 'purple';
      
      return `
        L.marker([${place.latitude}, ${place.longitude}], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 16px;">${getEmoji(category)}</div>',
            iconSize: [30, 30]
          })
        })
        .addTo(map)
        .bindPopup(\`
          <div style="min-width: 200px;">
            <h3 style="margin: 0 0 8px 0;">${place.place_name}</h3>
            <p style="margin: 4px 0; color: #666;">${category}</p>
            <p style="margin: 4px 0; font-size: 12px; color: #999;">${place.address_search_query}</p>
          </div>
        \`);
      `;
    }).join('\n');

    const centerLat = placesWithCoords.length > 0 
      ? placesWithCoords.reduce((sum, p) => sum + (p.latitude || 0), 0) / placesWithCoords.length
      : defaultLat;
    
    const centerLng = placesWithCoords.length > 0
      ? placesWithCoords.reduce((sum, p) => sum + (p.longitude || 0), 0) / placesWithCoords.length
      : defaultLng;

    const zoom = placesWithCoords.length > 0 ? 10 : defaultZoom;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html { 
            margin: 0; 
            padding: 0; 
            height: 100%; 
            width: 100%;
          }
          #map { 
            height: 100%; 
            width: 100%;
          }
          .custom-marker {
            background: none;
            border: none;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Initialize map
          const map = L.map('map').setView([${centerLat}, ${centerLng}], ${zoom});
          
          // Add OpenStreetMap tiles (completely free!)
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);

          // Add markers
          ${markers}

          // Fit bounds if we have places
          ${placesWithCoords.length > 0 ? `
            const group = L.featureGroup([${placesWithCoords.map((_, i) => `marker${i}`).join(',')}]);
            map.fitBounds(group.getBounds().pad(0.1));
          ` : ''}
        </script>
      </body>
      </html>
    `;
  };

  const getEmoji = (category: string | null) => {
    switch (category) {
      case 'Food': return '🍴';
      case 'Activity': return '🎯';
      case 'Stay': return '🏨';
      default: return '📍';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (places.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.emptyTitle}>No places yet!</Text>
        <Text style={styles.emptyText}>
          Upload your first travel video to see it on the map.
        </Text>
      </View>
    );
  }

  // Check if any places have coordinates
  const placesWithCoords = places.filter(p => p.latitude && p.longitude);

  if (placesWithCoords.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📍</Text>
        <Text style={styles.emptyTitle}>Places need coordinates!</Text>
        <Text style={styles.emptyText}>
          Add geocoding to your Edge Function to show places on the map.
          {'\n\n'}For now, check the List view to see your places!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: generateMapHTML() }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
      
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          🗺️ Powered by OpenStreetMap (Free & Open Source!)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  map: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 40,
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
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  infoBox: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 12,
    color: '#6366f1',
    textAlign: 'center',
    fontWeight: '600',
  },
});

