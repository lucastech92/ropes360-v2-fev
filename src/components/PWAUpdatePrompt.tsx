import { usePWAUpdate } from "@/hooks/usePWAUpdate";

// Auto-update is now silent - this component just initializes the hook
export const PWAUpdatePrompt = () => {
  usePWAUpdate();
  return null;
};
