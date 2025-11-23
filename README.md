# 🌍 TokTrip Planner - MVP

**100% Supabase | No Credit Card Required | Truly Free!**

A mobile app that automatically extracts locations from travel videos using AI and displays them on a map.

> **Update:** This app now runs entirely on Supabase (no Firebase). No credit card required!

---

## ✨ Features

- 📹 **Upload travel videos** from your phone gallery
- 🤖 **AI-powered location extraction** using Google Gemini 1.5 Flash
- 🗺️ **Automatic map markers** with real-time updates
- 🎯 **Categorization** (Food, Activity, Stay)
- 🏷️ **Vibe keyword extraction**
- ⚡ **Real-time sync** - see updates instantly

---

## 🚀 Tech Stack

- **Frontend:** React Native with Expo Router
- **Storage:** Supabase Storage (1GB free)
- **Database:** Supabase PostgreSQL (500MB free)
- **Functions:** Supabase Edge Functions (500K invocations/month free)
- **AI:** Google Gemini 1.5 Flash (15 requests/min free)
- **Maps:** react-native-maps
- **Real-time:** Supabase Realtime

**Everything is FREE (no credit card)!** ✅

---

## 🎯 Quick Start

### 1. Create Supabase Project (5 min)
- Go to [supabase.com](https://supabase.com) and sign up
- Create project: `toktrip-planner`
- Create storage bucket: `videos` (public)
- Run SQL migration (see `supabase/migrations/001_create_places_table.sql`)

### 2. Deploy Edge Function (5 min)
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set GEMINI_API_KEY=your_gemini_key
supabase functions deploy process-video
```

### 3. Create Database Webhook (2 min)
- Go to Database > Webhooks
- Create webhook for `places` table INSERT events
- Point to your Edge Function URL

### 4. Run the App (2 min)
```bash
npm install
npm start
```

**For detailed setup, see [`SETUP_SUPABASE_COMPLETE.md`](SETUP_SUPABASE_COMPLETE.md)**

---

## 📱 How It Works

```
1. User uploads video → Supabase Storage
2. App creates database record → status: 'processing'
3. Database webhook triggers → Edge Function
4. Edge Function downloads video
5. Gemini AI analyzes video
6. Edge Function updates database → status: 'completed'
7. Real-time listener → Map updates automatically!
```

---

## 💰 Cost Breakdown

| Service | Free Tier | Usage (100 videos/mo) | Cost |
|---------|-----------|----------------------|------|
| **Supabase Storage** | 1GB | 5GB | $0.08/mo |
| **Supabase Database** | 500MB | < 100MB | FREE |
| **Edge Functions** | 500K/mo | 100 calls | FREE |
| **Gemini API** | 15 req/min | 100 videos | $0.50/mo |
| **Total** | | | **$0.58/mo** ✅ |

**Compare to Firebase:**
- Firebase Storage: ❌ Requires paid plan ($0.026/GB + Blaze plan required)
- Firebase Functions: ❌ Requires paid plan (Blaze plan required)
- **Savings: ~$60-120/year!**

---

## 📁 Project Structure

```
toktrip-planner/
├── app/                          # Expo Router screens
│   ├── index.tsx                 # Home screen
│   ├── upload.tsx                # Video upload
│   └── map.tsx                   # Map view
├── src/
│   ├── config/
│   │   └── supabase.ts          # Supabase config
│   └── types/
│       └── index.ts             # TypeScript types
├── supabase/
│   ├── migrations/
│   │   └── 001_create_places_table.sql  # Database schema
│   └── functions/
│       └── process-video/        # Edge Function
│           ├── index.ts          # AI processing logic
│           └── README.md         # Function docs
├── package.json
├── app.json
└── SETUP_SUPABASE_COMPLETE.md   # Full setup guide
```

---

## 🛠️ Setup Guide

**Full Setup:** See [`SETUP_SUPABASE_COMPLETE.md`](SETUP_SUPABASE_COMPLETE.md)

**Quick Steps:**

1. **Supabase Project:**
   - Create project at supabase.com
   - Create `videos` storage bucket
   - Run SQL migration
   - Enable realtime on `places` table

2. **Gemini API:**
   - Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Set as Supabase secret

3. **Edge Function:**
   - Deploy with Supabase CLI
   - Create database webhook

4. **Run App:**
   - `npm install`
   - `npm start`

---

## 🎓 Database Schema

```sql
CREATE TABLE places (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  video_url TEXT NOT NULL,
  video_path TEXT NOT NULL,
  place_name TEXT,
  address_search_query TEXT,
  category TEXT CHECK (category IN ('Food', 'Activity', 'Stay')),
  vibe_keywords TEXT[],
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status TEXT CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🧪 Testing

### Test Upload
```bash
npm start
# Upload a video through the app
# Check Supabase Storage > videos bucket
```

### Test Edge Function
```bash
supabase functions logs process-video --follow
# Should see: "Processing video for place..."
```

### Test Database
```sql
-- In Supabase SQL Editor
SELECT * FROM places ORDER BY created_at DESC LIMIT 5;
```

### Test Real-time
- Upload a video
- Keep map screen open
- Watch place appear automatically (~30-60 seconds)

---

## 🐛 Troubleshooting

### Edge Function not triggering?
1. Check database webhook is enabled
2. Verify webhook URL includes your project ref
3. Check Edge Function logs: `supabase functions logs process-video`

### Video upload fails?
1. Ensure storage bucket `videos` is public
2. Check storage policies allow INSERT
3. Verify bucket name is exactly `videos`

### Map not updating?
1. Check realtime is enabled on `places` table
2. Pull down to refresh manually
3. Check database has completed places

### Gemini API error?
1. Verify API key is set: `supabase secrets list`
2. Check API quota in Google Cloud Console
3. Ensure video format is MP4

---

## 🎯 MVP Limitations

Current version does NOT include:
- ❌ User authentication (uses "demo-user")
- ❌ Geocoding (no lat/lng coordinates yet)
- ❌ Video thumbnails
- ❌ Social features
- ❌ Offline mode

These are planned for future releases!

---

## 🔮 Future Roadmap

### Phase 1: Core Features
- [ ] User authentication with Supabase Auth
- [ ] Google Maps Geocoding integration
- [ ] Video thumbnail generation
- [ ] Better error handling

### Phase 2: Enhanced Features
- [ ] Trip collections/albums
- [ ] Social sharing
- [ ] Export trip itinerary
- [ ] Offline mode with sync

### Phase 3: Advanced Features
- [ ] AI-generated trip summaries
- [ ] Collaborative trip planning
- [ ] Video transcoding (multiple qualities)
- [ ] Advanced search and filters

---

## 📚 Documentation

- **Full Setup Guide:** [`SETUP_SUPABASE_COMPLETE.md`](SETUP_SUPABASE_COMPLETE.md)
- **Edge Function Docs:** [`supabase/functions/process-video/README.md`](supabase/functions/process-video/README.md)
- **Project Structure:** [`PROJECT_STRUCTURE.txt`](PROJECT_STRUCTURE.txt)

---

## 🤝 Contributing

This is an MVP project. Contributions welcome!

Areas for improvement:
- User authentication
- Geocoding integration
- Video thumbnail generation
- UI/UX enhancements
- Performance optimizations

---

## 📄 License

MIT License - Feel free to use for your own projects!

---

## 🙏 Acknowledgments

- **Supabase** for the amazing free tier
- **Google Gemini** for AI video analysis
- **Expo** for React Native development experience
- **React Native Maps** for map integration

---

## 🆘 Support

Having issues?
1. Check [`SETUP_SUPABASE_COMPLETE.md`](SETUP_SUPABASE_COMPLETE.md) troubleshooting section
2. View Edge Function logs: `supabase functions logs process-video`
3. Check Supabase dashboard for errors
4. Open an issue on GitHub

---

**Built with ❤️ using React Native, Supabase, and Google Gemini AI**

**No Firebase. No Credit Card. Truly Free.** ✨

---

*Last updated: November 2025*
