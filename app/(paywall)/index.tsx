import { PaywallScreen } from "../../src/components/subscription/PaywallScreen";
import { router } from "expo-router";

export default function PaywallRoute() {
  console.log('🎯 PaywallRoute component rendered');
  
  return (
    <PaywallScreen 
      onClose={() => router.canGoBack() ? router.back() : router.replace("/(main)/dashboard")}
      source="paywall"
      offeringId="default"
    />
  );
}
