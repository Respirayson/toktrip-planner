/**
 * TypeScript type definitions for TokTrip Planner
 */

export interface PlaceData {
  place_name: string;
  address_search_query: string;
  category: 'Food' | 'Activity' | 'Stay';
  vibe_keywords: string[];
}

export interface Place extends PlaceData {
  id: string;
  userId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  timestamp: Date;
  latitude?: number;
  longitude?: number;
  status: 'processing' | 'completed' | 'failed';
  errorMessage?: string;
}

export interface VideoUpload {
  uri: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  place: Place;
}


