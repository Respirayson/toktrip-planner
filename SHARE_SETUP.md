# 📲 Share to TokTrip Setup Guide

This guide explains how the "Share to TokTrip" feature works and how to test it.

## 🎯 What This Does

When you're in **TikTok, Instagram, Gallery, or any app** with a video/photo:
1. Tap **Share** button
2. Select **"TokTrip Planner"** from the share menu
3. The app opens automatically with the content
4. You get a prompt: "Upload this video/photo now?"
5. Tap **Upload** → Auto-uploads to Supabase → AI extracts locations! 🚀

---

## ⚙️ How It Works

### **Android**
- **Intent Filters** in `app.json` register the app to receive shared media
- When another app shares a video/image, Android shows "TokTrip Planner" as an option
- The app receives the content URI via intent

### **iOS**
- **URL Scheme** (`toktrip://`) configured in `app.json`
- Apps can share content via custom URL schemes
- Share Extension (requires development build for full functionality)

---

## 📁 Files Modified

### 1. **`app.json`**
Added Android intent filters and iOS URL schemes:

```json
"android": {
  "intentFilters": [
    {
      "action": "SEND",
      "category": ["DEFAULT"],
      "data": [
        { "mimeType": "video/*" },
        { "mimeType": "image/*" }
      ]
    }
  ]
}
```

### 2. **`app/share-handler.tsx`** (NEW)
Custom hook to handle shared content from other apps:
- Listens for Android intents
- Handles iOS URL schemes
- Detects when app comes to foreground with shared content

### 3. **`app/upload.tsx`**
Updated to:
- Use `useSharedContent` hook
- Show auto-upload prompt when content is shared
- Handle URLs with shared content

---

## 🧪 Testing

### **Option 1: Expo Go (Limited)**
⚠️ **Expo Go has limited support** for intent filters. You'll need a development build for full functionality.

For basic testing in Expo Go:
1. Open the app
2. Use the "Select Photo or Video" button (works normally)

### **Option 2: Development Build (Full Support)**

To test the full "Share to TokTrip" feature:

#### **Step 1: Create Development Build**

**Android:**
```bash
npx expo install expo-dev-client
npx eas build --profile development --platform android
```

**iOS:**
```bash
npx expo install expo-dev-client
npx eas build --profile development --platform ios
```

#### **Step 2: Install the Build**
- Download and install the `.apk` (Android) or `.ipa` (iOS) on your device

#### **Step 3: Test Sharing**
1. Open **TikTok** or **Gallery**
2. Find a video/photo
3. Tap **Share**
4. Look for **"TokTrip Planner"** in the share menu
5. Tap it → App opens with content!
6. Tap **Upload** → Done! 🎉

---

## 🔧 Troubleshooting

### **"TokTrip Planner" doesn't appear in share menu (Android)**

**Fix 1: Rebuild the app**
```bash
npx expo prebuild --clean
npx expo run:android
```

**Fix 2: Check AndroidManifest.xml**
After running `npx expo prebuild`, check `android/app/src/main/AndroidManifest.xml`:
```xml
<intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="video/*" />
    <data android:mimeType="image/*" />
</intent-filter>
```

### **iOS: Share extension not working**

For iOS, full share extension support requires:
1. **Development build** (not Expo Go)
2. **Share Extension target** in Xcode project

To add iOS Share Extension:
```bash
npx expo prebuild
# Open in Xcode: ios/toktrip-planner.xcworkspace
# Add Share Extension target manually
```

### **Content URI is null/invalid**

On Android, the shared content URI might require permission:
- The app needs `READ_EXTERNAL_STORAGE` permission
- Already added in `app.json`

---

## 📱 User Flow

```
┌─────────────────┐
│   TikTok App    │
│   (Video open)  │
└────────┬────────┘
         │
         │ 1. Tap "Share"
         ▼
┌─────────────────┐
│  Android/iOS    │
│  Share Menu     │
│  ┌───────────┐  │
│  │ WhatsApp  │  │
│  │ Instagram │  │
│  │ 🎯 TokTrip│◄─── 2. Select TokTrip
│  └───────────┘  │
└────────┬────────┘
         │
         │ 3. Intent/URL scheme
         ▼
┌─────────────────┐
│  TokTrip App    │
│  Upload Screen  │
│  ┌───────────┐  │
│  │   📥      │  │
│  │ "Upload?" │◄─── 4. Auto-prompt
│  │ [Upload]  │  │
│  └───────────┘  │
└────────┬────────┘
         │
         │ 5. User taps Upload
         ▼
┌─────────────────┐
│  Supabase       │
│  Storage +      │
│  Edge Function  │◄─── 6. Auto-upload & process
│  Gemini AI      │
└────────┬────────┘
         │
         │ 7. Locations extracted
         ▼
┌─────────────────┐
│  Map Screen     │
│  📍 New pins!   │
└─────────────────┘
```

---

## 🚀 Current Status

✅ **Working:**
- Intent filters configured (Android)
- URL schemes configured (iOS)
- Share handler implemented
- Auto-upload prompt
- Works with development builds

⚠️ **Limitations in Expo Go:**
- Intent filters not fully supported
- Need development build for full functionality

📌 **Next Steps:**
1. Test in Expo Go with manual upload ✓
2. Create development build for full testing
3. Test with TikTok, Instagram, Gallery sharing
4. Refine UX based on user feedback

---

## 💡 Tips for Users

**Best Practices:**
- Share short videos (< 60 seconds)
- Share photos with recognizable landmarks
- Upload over WiFi for faster processing
- Check Map screen after ~30 seconds to see results

**Supported Apps:**
- ✅ TikTok
- ✅ Instagram
- ✅ Gallery/Photos app
- ✅ YouTube
- ✅ Any app with video/photo sharing!

---

## 🎉 Success Criteria

You'll know it's working when:
1. You share a TikTok video
2. "TokTrip Planner" appears in the share menu
3. The app opens instantly
4. Upload prompt appears automatically
5. One tap uploads and processes the video! 🚀

**This creates a seamless "TikTok → Map" experience!** 🗺️✨

