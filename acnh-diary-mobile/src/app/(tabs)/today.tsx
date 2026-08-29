import { getFirstIslandName } from '../../db/database';
import { TodayScreen } from '../../screens/TodayScreen';

export default function TodayRoute() {
  return <TodayScreen islandName={getFirstIslandName()} />;
}
