# Luna Mobile Release

Luna now includes Capacitor native shells for:

- `android/`
- `ios/`

The web app is built into those shells with:

```bash
npm run mobile:sync
```

## Current Native Setup

- Capacitor app id: `com.luna.aihub`
- Android project: generated and synced
- iOS project: generated and synced
- Plugins enabled:
  - `@capacitor/app`
  - `@capacitor/haptics`
  - `@capacitor/splash-screen`
  - `@capacitor/status-bar`
- Native voice input permissions are now declared for Android and iOS.
- Custom deep-link scheme reserved: `com.luna.aihub://`

## Scripts

- `npm run mobile:add:android`
- `npm run mobile:add:ios`
- `npm run mobile:sync`
- `npm run cap:open:android`
- `npm run cap:open:ios`

## CI Android Output

- `.github/workflows/android.yml` builds a release APK and AAB on GitHub Actions
- `.github/workflows/deploy-pages.yml` also builds a release APK and publishes it into the web build at `./downloads/luna-android.apk`
- if signing secrets are not configured, release builds fall back to the debug keystore so the APK remains installable for direct web download
- for Play Store-ready signing, set these repository secrets:
  - `LUNA_UPLOAD_STORE_FILE`
  - `LUNA_UPLOAD_STORE_PASSWORD`
  - `LUNA_UPLOAD_KEY_ALIAS`
  - `LUNA_UPLOAD_KEY_PASSWORD`

## Web Download Links

The web UI can surface native app buttons directly from the homepage and Luna workspace when these frontend env vars are set:

- `VITE_ANDROID_APP_URL`
  Use this for a hosted APK or Android release page.
- `VITE_IOS_APP_URL`
  Use this for an App Store or TestFlight link.

Notes:

- Android can point to a direct `.apk` download or a landing page.
- iOS should point to TestFlight or the App Store. Browser-side direct installs are not the normal distribution path on iPhone/iPad.

## Store Submission Checklist

1. Android
   - Open the project with `npm run cap:open:android`
   - Set the final signing config in Android Studio
   - Review `versionCode` and `versionName`
   - Confirm Play Console Data safety and microphone disclosure match the in-app voice transcription feature
   - Replace launcher and splash assets if you want store-specific branding beyond the current generated defaults
   - Build an AAB for Play Store upload

2. iOS
   - Install CocoaPods locally if missing
   - Run `cd ios/App && pod install`
   - Open with `npm run cap:open:ios`
   - Set the Apple Team, bundle signing, app version, and build number
   - Add App Store screenshots, privacy labels, and verify the microphone permission copy
   - Archive from Xcode for App Store Connect upload

## Notes

- This environment could not run CocoaPods or `xcodebuild`, so the iOS shell is generated but not fully validated here.
- Google web sign-in is intentionally disabled inside the native shell until a native OAuth flow is added. Email/password auth remains the safe path for store builds.
- Link preview metadata now points at real public assets in `public/`.
- If you want production-grade store assets, replace the current icon/splash images with final square app-brand files before submission.
