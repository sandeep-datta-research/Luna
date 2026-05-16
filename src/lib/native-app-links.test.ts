import { describe, expect, it } from "vitest";
import {
  getAndroidDownloadLabel,
  getIosDownloadLabel,
  getNativeDownloadOptions,
  getPreferredNativePlatform,
  isDirectAndroidApkUrl,
} from "./native-app-links";

describe("native app links", () => {
  it("detects device preference from user agent", () => {
    expect(getPreferredNativePlatform("Mozilla/5.0 (Linux; Android 14)")).toBe("android");
    expect(getPreferredNativePlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("ios");
    expect(getPreferredNativePlatform("Mozilla/5.0 (X11; Linux x86_64)")).toBe("other");
  });

  it("uses platform-aware labels", () => {
    expect(getAndroidDownloadLabel("https://cdn.luna.ai/releases/luna.apk")).toBe("Download Android APK");
    expect(getAndroidDownloadLabel("https://play.google.com/store/apps/details?id=luna")).toBe("Get for Android");
    expect(getIosDownloadLabel("https://testflight.apple.com/join/luna")).toBe("Join on TestFlight");
    expect(getIosDownloadLabel("itms-apps://apps.apple.com/app/id123")).toBe("Open on App Store");
  });

  it("moves the matching platform to the front", () => {
    const options = getNativeDownloadOptions("ios");
    if (options.length > 1) {
      expect(options[0]?.platform).toBe("ios");
      expect(options[0]?.preferred).toBe(true);
    }
  });

  it("detects direct apk downloads", () => {
    expect(isDirectAndroidApkUrl("https://cdn.luna.ai/releases/app.apk")).toBe(true);
    expect(isDirectAndroidApkUrl("https://play.google.com/store/apps/details?id=luna")).toBe(false);
  });
});
