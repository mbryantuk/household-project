import { createMachine } from 'xstate';

/**
 * Item 121: State Machines for UI
 * Manages the multi-step onboarding flow.
 */
export const onboardingMachine = createMachine({
  id: 'onboarding',
  initial: 'welcome',
  states: {
    welcome: {
      on: { NEXT: 'householdSetup' }
    },
    householdSetup: {
      on: { 
        NEXT: 'memberSync',
        BACK: 'welcome'
      }
    },
    memberSync: {
      on: { 
        NEXT: 'financeImport',
        BACK: 'householdSetup'
      }
    },
    financeImport: {
      on: { 
        NEXT: 'complete',
        BACK: 'memberSync'
      }
    },
    complete: {
      type: 'final'
    }
  }
});
