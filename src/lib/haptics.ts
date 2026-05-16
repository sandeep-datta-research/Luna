import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export async function triggerHaptic(style: ImpactStyle = ImpactStyle.Light) {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style });
      return;
    }

    if (typeof window !== "undefined" && typeof window.navigator?.vibrate === "function") {
      window.navigator.vibrate(10);
    }
  } catch {
    // Haptics are optional. Fail silently.
  }
}
