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

## Scripts

- `npm run mobile:add:android`
- `npm run mobile:add:ios`
- `npm run mobile:sync`
- `npm run cap:open:android`
- `npm run cap:open:ios`

## Store Submission Checklist

1. Android
   - Open the project with `npm run cap:open:android`
   - Set the final signing config in Android Studio
   - Review `versionCode` and `versionName`
   - Replace launcher and splash assets if you want store-specific branding beyond the current generated defaults
   - Build an AAB for Play Store upload

2. iOS
   - Install CocoaPods locally if missing
   - Run `cd ios/App && pod install`
   - Open with `npm run cap:open:ios`
   - Set the Apple Team, bundle signing, app version, and build number
   - Add App Store screenshots, privacy labels, and any required permission copy
   - Archive from Xcode for App Store Connect upload

## Notes

- This environment could not run CocoaPods or `xcodebuild`, so the iOS shell is generated but not fully validated here.
- Link preview metadata now points at real public assets in `public/`.
- If you want production-grade store assets, replace the current icon/splash images with final square app-brand files before submission.
