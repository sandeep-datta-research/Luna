/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: "com.luna.aihub",
  appName: "Luna",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
  },
  plugins: {
    App: {
      launchAutoHide: false,
    },
  },
};

export default config;
