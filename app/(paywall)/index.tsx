import { PaywallScreen } from "../../src/components/subscription/PaywallScreen";
import { router, useLocalSearchParams } from "expo-router";

export default function PaywallRoute() {
  console.log('🎯 PaywallRoute component rendered');
  const params = useLocalSearchParams();
  
  const handleSkip = () => {
    // When user taps close (X), go back to previous screen
    router.back();
  };

  const handleBack = () => {
    // When user taps back, go back to analysis results (proven results)
    router.replace('/(onboarding)/analysis-results');
  };
  
  return (
    <PaywallScreen 
      onClose={handleSkip}
      onBack={handleBack}
      source="paywall"
      offeringId="default"
    />
  );
}
