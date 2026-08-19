import { Briefcase, Clock, Navigation, PenLine, Plane, Sparkles } from 'lucide-react-native';
import type { ServiceMeta } from './services';

/** Maps ServiceMeta's icon key to its Lucide component — kept as a lookup (not inline per-call) so book/index.tsx and Home's service grid render the identical icon for a given service. */
export const SERVICE_ICON_COMPONENTS: Record<ServiceMeta['icon'], typeof Plane> = {
  plane: Plane,
  briefcase: Briefcase,
  sparkles: Sparkles,
  navigation: Navigation,
  clock: Clock,
  pen: PenLine,
};
