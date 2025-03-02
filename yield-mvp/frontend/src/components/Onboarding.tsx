import React, { useState } from 'react';
import { Steps } from 'intro.js-react';
import 'intro.js/introjs.css';
import { useWallet } from '../context/WalletContext';

interface OnboardingStep {
  element: string;
  intro: string;
  position: string;
}

const Onboarding: React.FC = () => {
  const { isConnected } = useWallet();
  const [enabled, setEnabled] = useState(true);

  const steps: OnboardingStep[] = [
    {
      element: '.wallet-connect',
      intro: 'First, connect your NEAR wallet to get started.',
      position: 'right',
    },
    {
      element: '.sentiment-gauge',
      intro: 'This gauge shows the current market sentiment based on our AI analysis.',
      position: 'bottom',
    },
    {
      element: '.strategy-list',
      intro: 'Browse available yield strategies and their performance metrics.',
      position: 'left',
    },
    {
      element: '.portfolio-overview',
      intro: 'Track your portfolio performance and active strategies here.',
      position: 'top',
    },
    {
      element: '.transaction-history',
      intro: 'View your complete transaction history and earnings.',
      position: 'top',
    },
  ];

  const onExit = () => {
    setEnabled(false);
    localStorage.setItem('onboardingCompleted', 'true');
  };

  if (!isConnected || localStorage.getItem('onboardingCompleted') === 'true') {
    return null;
  }

  return (
    <Steps
      enabled={enabled}
      steps={steps}
      initialStep={0}
      onExit={onExit}
      options={{
        doneLabel: 'Finish',
        showBullets: true,
        showProgress: true,
        hideNext: false,
        exitOnOverlayClick: false,
        overlayOpacity: 0.8,
        scrollToElement: true,
        disableInteraction: false,
      }}
    />
  );
};

export default Onboarding;
