function normalizeNativeAppUrl(input: string | undefined) {
  const value = (input || "").trim();
  if (!value) return "";

  if (/^(https?:|itms-apps:|market:)/i.test(value)) {
    return value;
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i.test(value)) {
    return `https://${value}`;
  }

  return value;
}

function getClientUserAgent() {
  if (typeof window === "undefined") return "";
  return window.navigator?.userAgent || "";
}

const androidDownloadUrl = normalizeNativeAppUrl(import.meta.env.VITE_ANDROID_APP_URL);
const iosDownloadUrl = normalizeNativeAppUrl(import.meta.env.VITE_IOS_APP_URL);

export const nativeAppLinks = {
  androidDownloadUrl,
  iosDownloadUrl,
};

export const hasNativeAppLinks = Boolean(androidDownloadUrl || iosDownloadUrl);

export function isDirectAndroidApkUrl(url = androidDownloadUrl) {
  return /\.apk(?:[?#]|$)/i.test(url);
}

export function getIosDownloadLabel(url = iosDownloadUrl) {
  if (!url) return "";
  if (/testflight\.apple\.com/i.test(url)) return "Join on TestFlight";
  if (/apps\.apple\.com|itunes\.apple\.com|itms-apps:/i.test(url)) return "Open on App Store";
  return "Get for iPhone & iPad";
}

export function getAndroidDownloadLabel(url = androidDownloadUrl) {
  if (!url) return "";
  return isDirectAndroidApkUrl(url) ? "Download Android APK" : "Get for Android";
}

export function getPreferredNativePlatform(userAgent = getClientUserAgent()) {
  if (/Android/i.test(userAgent)) return "android";
  if (/iPad|iPhone|iPod/i.test(userAgent)) return "ios";
  return "other";
}

export function getNativeDownloadOptions(platform = getPreferredNativePlatform()) {
  const options = [
    androidDownloadUrl
      ? {
          platform: "android",
          href: androidDownloadUrl,
          label: getAndroidDownloadLabel(androidDownloadUrl),
          preferred: platform === "android",
          directDownload: isDirectAndroidApkUrl(androidDownloadUrl),
        }
      : null,
    iosDownloadUrl
      ? {
          platform: "ios",
          href: iosDownloadUrl,
          label: getIosDownloadLabel(iosDownloadUrl),
          preferred: platform === "ios",
          directDownload: false,
        }
      : null,
  ].filter(Boolean) as Array<{
    platform: "android" | "ios";
    href: string;
    label: string;
    preferred: boolean;
    directDownload: boolean;
  }>;

  return options.sort((a, b) => Number(b.preferred) - Number(a.preferred));
}
