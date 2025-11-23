/**
 * Home Screen - Landing page for TokTrip Planner
 * Modern gradient design with glassmorphism
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <View style={styles.gradientBg}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.emoji}>✈️</Text>
          <Text style={styles.title}>TokTrip</Text>
          <Text style={styles.subtitle}>
            Transform your travel moments into memories
          </Text>
          <View style={styles.tagline}>
            <Text style={styles.taglineText}>📸 Upload</Text>
            <Text style={styles.taglineDot}>•</Text>
            <Text style={styles.taglineText}>🤖 AI Extracts</Text>
            <Text style={styles.taglineDot}>•</Text>
            <Text style={styles.taglineText}>🗺️ Explore</Text>
          </View>
        </View>

        {/* Action Cards */}
        <View style={styles.cardsContainer}>
          <TouchableOpacity
            style={[styles.card, styles.primaryCard]}
            onPress={() => router.push('/upload')}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconContainer}>
              <Text style={styles.cardIcon}>📸</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Upload Media</Text>
              <Text style={styles.cardDescription}>
                Share photos or videos from your trips
              </Text>
            </View>
            <Text style={styles.cardArrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.rowCards}>
            <TouchableOpacity
              style={[styles.card, styles.secondaryCard]}
              onPress={() => router.push('/map')}
              activeOpacity={0.8}
            >
              <Text style={styles.smallCardIcon}>📋</Text>
              <Text style={styles.smallCardTitle}>My Places</Text>
              <Text style={styles.smallCardSubtitle}>List View</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.card, styles.secondaryCard]}
              onPress={() => router.push('/map-view')}
              activeOpacity={0.8}
            >
              <Text style={styles.smallCardIcon}>🗺️</Text>
              <Text style={styles.smallCardTitle}>Map View</Text>
              <Text style={styles.smallCardSubtitle}>Explore</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>⚡ Powered by Gemini AI</Text>
        </View>
      </View>
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
    opacity: 0.2,
  },
  circle1: {
    width: 400,
    height: 400,
    backgroundColor: '#6366f1',
    top: -100,
    right: -100,
  },
  circle2: {
    width: 300,
    height: 300,
    backgroundColor: '#8b5cf6',
    bottom: -50,
    left: -50,
  },
  circle3: {
    width: 250,
    height: 250,
    backgroundColor: '#ec4899',
    top: '40%',
    left: '50%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 12,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  tagline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  taglineText: {
    fontSize: 13,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  taglineDot: {
    fontSize: 13,
    color: '#64748b',
  },
  cardsContainer: {
    flex: 1,
    gap: 16,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  primaryCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 120,
  },
  cardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardIcon: {
    fontSize: 32,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  cardArrow: {
    fontSize: 32,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: 'bold',
  },
  rowCards: {
    flexDirection: 'row',
    gap: 16,
  },
  secondaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    minHeight: 150,
    justifyContent: 'center',
  },
  smallCardIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  smallCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  smallCardSubtitle: {
    fontSize: 13,
    color: '#cbd5e1',
  },
  badge: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'center',
  },
  badgeText: {
    fontSize: 13,
    color: '#e2e8f0',
    fontWeight: '600',
  },
});


