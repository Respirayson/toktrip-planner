/**
 * Home Screen - Landing page for TokTrip Planner
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌍 TokTrip Planner</Text>
        <Text style={styles.subtitle}>
          Upload your travel videos and discover them on a map
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.uploadButton]}
          onPress={() => router.push('/upload')}
        >
          <Text style={styles.buttonText}>📹 Upload Video</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.listButton]}
          onPress={() => router.push('/map')}
        >
          <Text style={styles.buttonText}>📋 My Places (List)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.mapButton]}
          onPress={() => router.push('/map-view')}
        >
          <Text style={styles.buttonText}>🗺️ Map View (OpenStreetMap)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by Google Gemini AI 🤖
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 26,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 40,
  },
  button: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadButton: {
    backgroundColor: '#6366f1',
  },
  listButton: {
    backgroundColor: '#10b981',
  },
  mapButton: {
    backgroundColor: '#8b5cf6',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#94a3b8',
  },
});


