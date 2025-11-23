# 🚀 Quick Test: Share to TokTrip

## ⚠️ Important: Expo Go Limitations

**The "Share to TokTrip" feature has LIMITED support in Expo Go.**

For full functionality, you need a **development build**. But here's how to test what works now:

---

## ✅ What Works NOW (in Expo Go)

### **Manual Upload Test:**
1. Open the TokTrip app in Expo Go
2. Go to **Upload** screen
3. Tap **"Select Photo or Video"**
4. Choose a TikTok video you've saved to your gallery
5. Upload it! ✅

**This works perfectly!** The app will:
- Upload the media ✓
- Extract locations with Gemini AI ✓
- Show accurate pins on the map ✓

---

## 🎯 What Needs Development Build

### **Direct Sharing from TikTok:**

To enable **Share → TokTrip** directly from TikTok:

1. **Create a development build:**
   ```bash
   npx expo install expo-dev-client
   npx eas build --profile development --platform android
   ```

2. **Install the APK** on your Android phone

3. **Share from TikTok:**
   - Open TikTok
   - Find a video
   - Tap Share
   - Look for "TokTrip Planner"
   - Tap it → Auto-opens app with video!

---

## 📱 Quick Test Flow (Expo Go)

**Current Workaround:**

```
TikTok → Save Video to Gallery → Open TokTrip → Upload → Success! ✅
```

**After Development Build:**

```
TikTok → Share → TokTrip → Auto-Upload → Success! ✅
```

---

## 🔧 Building for Full Functionality

### **Option A: EAS Build (Recommended)**

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Build for Android
eas build --profile development --platform android

# Install the downloaded APK on your device
```

### **Option B: Local Build**

```bash
# Prebuild native projects
npx expo prebuild

# Build Android locally
cd android
./gradlew assembleDebug

# Install: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🧪 Testing Checklist

### **Phase 1: Expo Go (NOW)**
- [✓] Manual photo/video upload
- [✓] Gemini AI extraction
- [✓] Accurate map coordinates
- [✓] Multiple places from one video

### **Phase 2: Development Build (NEXT)**
- [ ] Share from TikTok → TokTrip appears
- [ ] Share from Instagram → TokTrip appears
- [ ] Share from Gallery → TokTrip appears
- [ ] Auto-upload prompt appears
- [ ] One-tap upload works

---

## 💡 Pro Tip

**For now, just use the app normally:**
1. Save TikTok videos to your gallery
2. Open TokTrip
3. Upload from gallery

**It works great and is 100% free!** 🎉

The "direct share" feature is a UX enhancement that can be added later with a development build.

---

## 🎯 Summary

| Feature | Expo Go | Dev Build |
|---------|---------|-----------|
| Manual upload from gallery | ✅ Works | ✅ Works |
| Share from TikTok | ❌ No | ✅ Yes |
| Share from Instagram | ❌ No | ✅ Yes |
| Auto-upload prompt | ✅ Works | ✅ Works |
| Gemini AI extraction | ✅ Works | ✅ Works |
| Accurate coordinates | ✅ Works | ✅ Works |

**Bottom line:** Everything works except direct sharing from other apps. That's just a convenience feature!

---

**Ready to test? Open Expo Go and try uploading a video! 📸🚀**

