import { getActiveIsland, getRoutinesForIsland } from '../../db/database';
import { TodayScreen } from '../../screens/TodayScreen';

export default function TodayRoute() {
  const island = getActiveIsland();
  const routines = island ? getRoutinesForIsland(island.id) : [];

  return <TodayScreen island={island} routines={routines} />;
}
