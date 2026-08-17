export interface ConciergeQuickAction {
  label: string;
  prompt: string;
}

export const CONCIERGE_QUICK_ACTIONS: ConciergeQuickAction[] = [
  { label: 'Book Airport Transfer', prompt: 'I need transportation from DFW Airport' },
  { label: 'Choose a Vehicle', prompt: 'Help me choose a vehicle for my trip' },
  { label: 'Corporate Transportation', prompt: 'Tell me about corporate transportation options' },
  { label: 'Need Help With My Ride', prompt: 'I need help with my ride' },
];
