import React, { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useTheme } from '@mui/joy/styles';
import { useHousehold } from '../../contexts/HouseholdContext';

const TOUR_STEPS = [
  {
    target: 'body',
    placement: 'center',
    title: 'Welcome to Mantel! 🏠',
    content: "We're excited to help you manage your household efficiently. Let's take a quick tour of the key features.",
    disableBeacon: true,
  },
  {
    target: '#tour-dashboard-greeting',
    title: 'Your Dashboard',
    content: 'This is your command center. You can see your daily greeting, current date, and active household here.',
  },
  {
    target: '#tour-hh-selector',
    title: 'Household Selector',
    content: 'Click your household icon to jump back to the dashboard at any time, or hover to see sub-items.',
  },
  {
    target: '#tour-nav-house',
    title: 'House Hub',
    content: 'Manage your home details, residents, pets, and vehicles from the House section.',
  },
  {
    target: '#tour-nav-finance',
    title: 'Financial Management',
    content: 'Track your income, savings, investments, and liabilities. Use different financial profiles for joint or personal tracking.',
  },
  {
    target: '#tour-nav-calendar',
    title: 'Calendar & Renewals',
    content: 'Keep track of important dates, birthdays, and upcoming renewals for insurance or tax.',
  },
  {
    target: '#tour-dashboard-customize',
    title: 'Personalize Your View',
    content: 'You can rearrange, add, or remove widgets on your dashboard to suit your needs. Just click Customize!',
  },
  {
    target: 'body',
    placement: 'center',
    title: "You're all set! 🚀",
    content: "That's the basics. Feel free to explore and make Mantel your own. If you ever need help, look for the Help section in Settings.",
  }
];

export default function OnboardingTour() {
  const theme = useTheme();
  const { user, onUpdateProfile } = useHousehold();
  const [run, setRun] = useState(false);

  useEffect(() => {
    try {
        // Check if user has completed the tour
        const tourStatus = localStorage.getItem('onboarding_completed');
        console.log("[Tour] Status:", tourStatus, "User:", !!user);
        
        if (!tourStatus && user) {
          console.log("[Tour] Starting timer...");
          // Small delay to ensure everything is rendered
          const timer = setTimeout(() => {
            console.log("[Tour] Setting run=true");
            setRun(true);
          }, 2000);
          return () => clearTimeout(timer);
        }
    } catch (err) {
        console.error("[Tour] Init Error:", err);
    }
  }, [user]);

  const handleJoyrideCallback = (data) => {
    try {
        const { status } = data;
        console.log("[Tour] Callback status:", status);
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
          setRun(false);
          localStorage.setItem('onboarding_completed', 'true');
          console.log("[Tour] Completed/Skipped");
        }
    } catch (err) {
        console.error("[Tour] Callback Error:", err);
    }
  };

  try {
      return (
        <Joyride
          steps={TOUR_STEPS}
          run={run}
          continuous={true}
          showProgress={true}
          showSkipButton={true}
          callback={handleJoyrideCallback}
          styles={{
            options: {
              primaryColor: theme.vars.palette.primary.solidBg,
              zIndex: 10000,
              backgroundColor: theme.vars.palette.background.surface,
              textColor: theme.vars.palette.text.primary,
              arrowColor: theme.vars.palette.background.surface,
            },
            tooltipContainer: {
                textAlign: 'left',
                borderRadius: '12px',
                padding: '4px',
            },
            buttonNext: {
                borderRadius: '8px',
                fontWeight: 'bold',
            },
            buttonBack: {
                marginRight: '10px',
            },
            buttonSkip: {
                color: theme.vars.palette.neutral.plainColor,
            }
          }}
        />
      );
  } catch (err) {
      console.error("[Tour] Render Error:", err);
      return null;
  }
}