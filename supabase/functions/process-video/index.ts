// Supabase Edge Function: Process Video with Gemini AI
// Deno runtime - runs on the edge!

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface PlaceData {
  place_name: string;
  address_search_query: string;
  category: 'Food' | 'Activity' | 'Stay';
  vibe_keywords: string[];
  latitude?: number;
  longitude?: number;
}

interface GeminiResponse {
  places: PlaceData[];
}

// Free geocoding using OpenStreetMap Nominatim with fallback
async function geocodeAddress(address: string): Promise<{ lat: number, lng: number } | null> {
  // Try progressively simpler queries if detailed address fails
  const addressVariations = generateAddressFallbacks(address);
  
  for (let i = 0; i < addressVariations.length; i++) {
    const currentAddress = addressVariations[i];
    console.log(`Attempt ${i + 1}/${addressVariations.length}: "${currentAddress}"`);
    
    try {
      // Add delay to respect Nominatim rate limits (1 request per second)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(currentAddress)}&limit=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TokTripPlanner/1.0 (contact@toktripplanner.com)'
        }
      });

      if (!response.ok) {
        console.error(`Nominatim API error: ${response.status} ${response.statusText}`);
        continue; // Try next variation
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const coords = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
        console.log(`✓ SUCCESS: ${currentAddress} -> (${coords.lat}, ${coords.lng})`);
        console.log(`   Full location: ${data[0].display_name}`);
        return coords;
      }

      console.log(`✗ No results for attempt ${i + 1}`);
    } catch (error) {
      console.error(`Error on attempt ${i + 1}:`, error);
    }
  }
  
  console.error(`❌ FAILED: Could not geocode "${address}" after ${addressVariations.length} attempts`);
  return null;
}

// Generate fallback address variations
// "Village Coffee, Castle Hill Village, Canterbury, New Zealand"
// → Try: full address, then drop place name, then just region + country
function generateAddressFallbacks(address: string): string[] {
  const parts = address.split(',').map(s => s.trim());
  const variations: string[] = [];
  
  // Try full address first
  variations.push(address);
  
  // If we have 4+ parts (place, locality, region, country), try without place name
  if (parts.length >= 4) {
    // Drop first part (specific place name)
    variations.push(parts.slice(1).join(', '));
  }
  
  // If we have 3+ parts, try just last 2 (region, country)
  if (parts.length >= 3) {
    variations.push(parts.slice(-2).join(', '));
  }
  
  // Last resort: just the country
  if (parts.length >= 2) {
    variations.push(parts[parts.length - 1]);
  }
  
  // Remove duplicates
  return [...new Set(variations)];
}

serve(async (req) => {
  let record;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  try {
    // Parse request body ONCE and save it
    const requestBody = await req.json();
    record = requestBody.record;
    
    console.log('Processing video for place:', record.id);

    // Only process if status is 'processing'
    if (record.status !== 'processing') {
      return new Response(
        JSON.stringify({ message: 'Skipping - not in processing status' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Download video from Supabase Storage
    const { data: videoData, error: downloadError } = await supabase.storage
      .from('videos')
      .download(record.video_path);

    if (downloadError) {
      throw new Error(`Storage download error: ${downloadError.message}`);
    }

    // Convert blob to base64 (handle large files without stack overflow)
    const arrayBuffer = await videoData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Detect media type
    const mimeType = videoData.type || 'video/mp4';
    const mediaType = mimeType.startsWith('image/') ? 'image' : 'video';
    
    // Check file size
    const fileSizeMB = bytes.length / (1024 * 1024);
    console.log(`Downloaded ${mediaType}: ${record.video_path}, size: ${fileSizeMB.toFixed(2)} MB, type: ${mimeType}`);
    
    if (fileSizeMB > 50) {
      throw new Error(`File too large: ${fileSizeMB.toFixed(2)} MB. Maximum is 50 MB.`);
    }
    
    // Convert to base64 in chunks to avoid stack overflow
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Media = btoa(binary);

    console.log('Base64 conversion complete, calling Gemini...');

    // Call Gemini API
    const geminiResponse = await analyzeVideoWithGemini(base64Media, mimeType);

    console.log('Gemini analysis result:', geminiResponse);

    const placesFound = geminiResponse.places;
    
    if (!placesFound || placesFound.length === 0) {
      throw new Error('No places found in video');
    }

    console.log(`Found ${placesFound.length} place(s) in video/image`);

    // Use Nominatim as PRIMARY (more accurate than Gemini's approximations)
    // Use Gemini coordinates only as fallback
    console.log('Geocoding places for accurate coordinates...');
    const placesWithCoords = [];
    
    for (const placeData of placesFound) {
      let latitude = null;
      let longitude = null;
      
      // Try Nominatim FIRST (most accurate)
      console.log(`\n--- Geocoding: ${placeData.place_name} ---`);
      const coords = await geocodeAddress(placeData.address_search_query);
      
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
        console.log(`✓ Using accurate Nominatim coordinates: (${latitude}, ${longitude})`);
      } else if (placeData.latitude && placeData.longitude) {
        // Fallback to Gemini's approximate coordinates
        latitude = placeData.latitude;
        longitude = placeData.longitude;
        console.log(`⚠️  Using Gemini's approximate coordinates: (${latitude}, ${longitude})`);
      } else {
        console.log(`❌ No coordinates available for: ${placeData.place_name}`);
      }
      
      placesWithCoords.push({
        user_id: record.user_id,
        video_path: record.video_path,
        video_url: record.video_url,
        place_name: placeData.place_name,
        address_search_query: placeData.address_search_query,
        category: placeData.category,
        vibe_keywords: placeData.vibe_keywords,
        latitude: latitude,
        longitude: longitude,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Delete the original placeholder record
    await supabase
      .from('places')
      .delete()
      .eq('id', record.id);

    // Insert all places with coordinates
    const { data: insertedPlaces, error: insertError } = await supabase
      .from('places')
      .insert(placesWithCoords)
      .select();

    if (insertError) {
      throw new Error(`Database insert error: ${insertError.message}`);
    }

    const placesWithCoordinates = insertedPlaces.filter(p => p.latitude && p.longitude).length;
    console.log(`Successfully inserted ${insertedPlaces.length} place(s), ${placesWithCoordinates} with coordinates`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        originalPlaceId: record.id,
        placesCreated: insertedPlaces.length,
        placesWithCoordinates: placesWithCoordinates,
        places: insertedPlaces
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error processing video:', error);

    // Try to update status to failed (use saved record, don't read body again)
    if (record && record.id) {
      try {
        await supabase
          .from('places')
          .update({
            status: 'failed',
            error_message: error.message || 'Unknown error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id);
      } catch (updateError) {
        console.error('Failed to update error status:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error'
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function analyzeVideoWithGemini(mediaBase64: string, mimeType: string): Promise<GeminiResponse> {
  const mediaTypeDesc = mimeType.startsWith('image/') ? 'travel photo' : 'travel video';
  const systemPrompt = `You are a travel ${mediaTypeDesc} analyzer. Watch/view this ${mediaTypeDesc} carefully and extract ALL distinct places/locations shown.

For EACH place you identify, extract:
1. The name of the place/location  
2. A DETAILED search query with full address (place name + street/area + city + country)
   - Be as SPECIFIC as possible to help with geocoding
   - Include street names, neighborhoods, or nearby landmarks if visible
3. The category: must be one of "Food", "Activity", or "Stay"
4. 3-5 keywords that describe the vibe/atmosphere
5. **LATITUDE and LONGITUDE coordinates** (if you know them, otherwise can be null)

Return ONLY a valid JSON object with this exact structure:
{
  "places": [
    {
      "place_name": "First Place Name",
      "address_search_query": "Place Name, City, Country",
      "category": "Food" | "Activity" | "Stay",
      "vibe_keywords": ["keyword1", "keyword2", "keyword3"],
      "latitude": -44.67,
      "longitude": 169.07
    }
  ]
}

CRITICAL RULES:
- **address_search_query is MOST IMPORTANT** - be as detailed as possible
- Include street address, neighborhood, city, region, country
- More detail = better location accuracy on map
- Examples of GOOD detailed addresses:
  ✓ "Marina Bay Sands Hotel, 10 Bayfront Avenue, Marina Bay, Singapore"
  ✓ "Roys Peak Track Car Park, Wanaka-Mount Aspiring Road, Wanaka, New Zealand"
  ✓ "Eiffel Tower, Champ de Mars, 5 Avenue Anatole France, Paris, France"
- Latitude/longitude are optional (provide if you know exact coords, otherwise null)
- Category must be exactly one of: Food, Activity, Stay
- Include 3-5 vibe keywords per place
- Return only valid JSON, no additional text

Examples:
{
  "places": [
    {
      "place_name": "Eiffel Tower",
      "address_search_query": "Eiffel Tower, Paris, France",
      "category": "Activity",
      "vibe_keywords": ["iconic", "romantic", "historic"],
      "latitude": 48.858,
      "longitude": 2.294
    },
    {
      "place_name": "Marina Bay Sands",
      "address_search_query": "Marina Bay Sands, Singapore",
      "category": "Stay",
      "vibe_keywords": ["luxury", "modern", "rooftop"],
      "latitude": 1.284,
      "longitude": 103.860
    }
  ]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: mediaBase64,
                },
              },
              {
                text: systemPrompt,
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const text = result.candidates[0].content.parts[0].text;

  console.log('Gemini raw response:', text);

  // Parse JSON response
  const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsedData: GeminiResponse = JSON.parse(jsonText);

  // Validate response
  if (!parsedData.places || !Array.isArray(parsedData.places) || parsedData.places.length === 0) {
    throw new Error('Invalid response structure from Gemini - no places array');
  }

  const validCategories = ['Food', 'Activity', 'Stay'];
  
  // Validate each place
  parsedData.places.forEach((place, index) => {
    if (!place.place_name || !place.address_search_query || !place.category) {
      throw new Error(`Invalid place structure at index ${index}`);
    }
    if (!validCategories.includes(place.category)) {
      throw new Error(`Invalid category at index ${index}: ${place.category}`);
    }
    // Validate coordinates if provided
    if (place.latitude !== undefined && (place.latitude < -90 || place.latitude > 90)) {
      console.warn(`Invalid latitude at index ${index}: ${place.latitude}, will use Nominatim fallback`);
      place.latitude = undefined;
    }
    if (place.longitude !== undefined && (place.longitude < -180 || place.longitude > 180)) {
      console.warn(`Invalid longitude at index ${index}: ${place.longitude}, will use Nominatim fallback`);
      place.longitude = undefined;
    }
  });

  return parsedData;
}

