import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.luna.aihub",
  appName: "Luna",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
  plugins: {
    App: {
      launchAutoHide: false,
    },
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#05060d",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#05060d",
      overlaysWebView: true,
    },
  },
};

export default config;
