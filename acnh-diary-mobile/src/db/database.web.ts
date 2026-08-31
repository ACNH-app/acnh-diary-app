import type { CatalogCategory } from '@/types/catalog';
import type {
  EncyclopediaCategory,
  EncyclopediaState,
  EncyclopediaStatus,
} from '@/types/encyclopedia';
import type {
  Island,
  IslandInput,
  NpcVisit,
  PlayerProfile,
  Routine,
  RoutineProgress,
} from '@/types/island';
import type { VillagerState, VillagerStatus } from '@/types/villager-state';

const now = new Date().toISOString();

export const TEST_ISLAND: IslandInput = {
  name: 'Preview',
  fruit: 'Apple',
  flower: 'Rose',
  hemisphere: 'north',
  timezone: 'Asia/Seoul',
  playerName: 'Player',
};

const EMPTY_ENCYCLOPEDIA_STATE: EncyclopediaState = {
  caught: false,
  owned: false,
  donated: false,
  genuineOwned: false,
  fakeOwned: false,
};

const EMPTY_VILLAGER_STATE: VillagerState = {
  wishlist: false,
  campsiteVisited: false,
  islandResident: false,
  movedOut: false,
  photoReceived: false,
  posterOwned: false,
};

let islands: Island[] = [
  {
    id: 'preview-island',
    name: TEST_ISLAND.name,
    fruit: TEST_ISLAND.fruit,
    flower: TEST_ISLAND.flower,
    hemisphere: TEST_ISLAND.hemisphere,
    timezone: TEST_ISLAND.timezone,
    playerName: TEST_ISLAND.playerName,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  },
];

let manualGameDate: string | null = null;
const routines = new Map<string, Routine[]>();
const routineProgress = new Map<string, RoutineProgress>();
const npcVisits = new Map<string, string>();
const villagerStates = new Map<string, VillagerState>();
const collectionStates = new Map<string, EncyclopediaState>();
const collectionQuantities = new Map<string, number>();
const campsiteVisits = new Map<string, Set<string>>();

export const db = {
  execSync: () => undefined,
  getAllSync: () => [],
  runSync: () => ({ changes: 0 }),
  withTransactionSync: (callback: () => void) => callback(),
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function collectionKey(
  itemType: EncyclopediaCategory | CatalogCategory,
  itemId: string,
) {
  return `${itemType}/${itemId}`;
}

function routineProgressKey(islandId: string, routineId: string, date: string) {
  return `${islandId}/${routineId}/${date}`;
}

function npcVisitKey(islandId: string, visitDate: string) {
  return `${islandId}/${visitDate}`;
}

function getActiveIslandId() {
  return getActiveIsland()?.id ?? 'preview-island';
}

export function initializeDatabase() {
  seedInitialIslandIfNeeded();
}

export function getIslandCount() {
  return islands.length;
}

export function getActiveIsland(): Island | null {
  return islands.find((island) => island.isActive) ?? islands[0] ?? null;
}

export function getIslands(): Island[] {
  return [...islands].sort((left, right) => Number(right.isActive) - Number(left.isActive));
}

export function setActiveIsland(islandId: string) {
  if (!islands.some((island) => island.id === islandId)) throw new Error('ISLAND_NOT_FOUND');
  islands = islands.map((island) => ({ ...island, isActive: island.id === islandId }));
}

export function getPlayerProfileForIsland(islandId: string): PlayerProfile | null {
  const island = islands.find((item) => item.id === islandId);
  if (!island || !island.playerName) return null;
  return {
    islandId,
    name: island.playerName,
    birthdayDay: null,
    birthdayMonth: null,
  };
}

export function updateIsland(islandId: string, input: IslandInput) {
  islands = islands.map((island) =>
    island.id === islandId
      ? {
          ...island,
          flower: input.flower,
          fruit: input.fruit,
          hemisphere: input.hemisphere,
          name: input.name,
          playerName: input.playerName,
          timezone: input.timezone,
          updatedAt: new Date().toISOString(),
        }
      : island,
  );
}

export function deleteIsland(islandId: string) {
  if (islands.length <= 1) throw new Error('LAST_ISLAND');
  const wasActive = getActiveIsland()?.id === islandId;
  islands = islands.filter((island) => island.id !== islandId);
  if (wasActive && islands[0]) {
    islands[0] = { ...islands[0], isActive: true };
  }
}

export function getFirstIslandName() {
  return getActiveIsland()?.name ?? 'Preview';
}

export function getRoutinesForIsland(islandId: string) {
  return routines.get(islandId) ?? [];
}

export function getRoutineProgressForIsland(
  islandId: string,
  date: string,
): Record<string, RoutineProgress> {
  return Object.fromEntries(
    getRoutinesForIsland(islandId).map((routine) => [
      routine.id,
      routineProgress.get(routineProgressKey(islandId, routine.id, date)) ?? {
        currentCount: 0,
        isComplete: false,
      },
    ]),
  );
}

export function setRoutineProgress(
  islandId: string,
  routineId: string,
  date: string,
  currentCount: number,
  targetCount: number,
) {
  routineProgress.set(routineProgressKey(islandId, routineId, date), {
    currentCount,
    isComplete: currentCount >= targetCount,
  });
}

export function addRoutine(islandId: string, title: string, goalCount = 1) {
  const nextRoutine: Routine = {
    id: createId('routine'),
    islandId,
    title,
    goalCount,
    repeatType: 'daily',
    createdAt: new Date().toISOString(),
  };
  routines.set(islandId, [...getRoutinesForIsland(islandId), nextRoutine]);
}

export function updateRoutine(routineId: string, title: string, goalCount: number) {
  const islandId = getActiveIslandId();
  routines.set(
    islandId,
    getRoutinesForIsland(islandId).map((routine) =>
      routine.id === routineId ? { ...routine, goalCount, title } : routine,
    ),
  );
}

export function deleteRoutine(routineId: string) {
  const islandId = getActiveIslandId();
  routines.set(
    islandId,
    getRoutinesForIsland(islandId).filter((routine) => routine.id !== routineId),
  );
}

export function getNpcVisitsForIsland(
  islandId: string,
  startDate: string,
  endDate: string,
): Record<string, string> {
  return Object.fromEntries(
    [...npcVisits.entries()]
      .filter(([key]) => key.startsWith(`${islandId}/`))
      .map(([key, npcName]) => [key.slice(islandId.length + 1), npcName])
      .filter(([visitDate]) => visitDate >= startDate && visitDate <= endDate),
  );
}

export function setNpcVisit(visit: NpcVisit) {
  npcVisits.set(npcVisitKey(visit.islandId, visit.visitDate), visit.npcName);
}

export function clearNpcVisitsForWeek(islandId: string, startDate: string, endDate: string) {
  for (const key of [...npcVisits.keys()]) {
    const visitDate = key.slice(islandId.length + 1);
    if (key.startsWith(`${islandId}/`) && visitDate >= startDate && visitDate <= endDate) {
      npcVisits.delete(key);
    }
  }
}

export function getManualGameDate() {
  return manualGameDate;
}

export function setManualGameDate(value: string | null) {
  manualGameDate = value;
}

export function getVillagerStatesForIsland() {
  return Object.fromEntries(villagerStates.entries());
}

export function setVillagerStatus(
  islandId: string,
  villagerId: string,
  status: VillagerStatus,
  value: boolean,
) {
  const key = `${islandId}/${villagerId}`;
  villagerStates.set(key, {
    ...(villagerStates.get(key) ?? EMPTY_VILLAGER_STATE),
    [status]: value,
  });
}

export function getCollectionStatesForIsland(): Record<string, EncyclopediaState> {
  return Object.fromEntries(collectionStates.entries());
}

export function getCollectionQuantitiesForIsland(): Record<string, number> {
  return Object.fromEntries(collectionQuantities.entries());
}

export function setCollectionStatus(
  _islandId: string,
  itemType: EncyclopediaCategory | CatalogCategory,
  itemId: string,
  status: EncyclopediaStatus,
  value: boolean,
) {
  const key = collectionKey(itemType, itemId);
  collectionStates.set(key, {
    ...(collectionStates.get(key) ?? EMPTY_ENCYCLOPEDIA_STATE),
    [status]: value,
  });
}

export function setCatalogOwnedStatus(
  islandId: string,
  itemType: CatalogCategory,
  itemId: string,
  value: boolean,
  linkedVillager?: { id: string; status: VillagerStatus },
) {
  setCollectionStatus(islandId, itemType, itemId, 'owned', value);
  if (linkedVillager) {
    setVillagerStatus(islandId, linkedVillager.id, linkedVillager.status, value);
  }
}

export function setCatalogOwnedStatusForItems(
  islandId: string,
  itemType: CatalogCategory,
  items: Array<{ id: string; linkedVillager?: { id: string; status: VillagerStatus } }>,
  value: boolean,
) {
  for (const item of items) {
    setCatalogOwnedStatus(islandId, itemType, item.id, value, item.linkedVillager);
  }
}

export function setCollectionStatusForItems(
  islandId: string,
  itemType: EncyclopediaCategory | CatalogCategory,
  itemIds: string[],
  status: EncyclopediaStatus,
  value: boolean,
) {
  for (const itemId of itemIds) {
    setCollectionStatus(islandId, itemType, itemId, status, value);
  }
}

export function setCollectionQuantity(
  _islandId: string,
  itemType: CatalogCategory,
  itemId: string,
  quantity: number,
) {
  collectionQuantities.set(collectionKey(itemType, itemId), quantity);
}

export function getCampsiteVisitsForIsland(): Record<string, string[]> {
  return Object.fromEntries(
    [...campsiteVisits.entries()].map(([villagerId, visits]) => [villagerId, [...visits]]),
  );
}

export function addCampsiteVisit(_islandId: string, villagerId: string, visitDate: string) {
  const visits = campsiteVisits.get(villagerId) ?? new Set<string>();
  visits.add(visitDate);
  campsiteVisits.set(villagerId, visits);
}

export function removeCampsiteVisit(_islandId: string, villagerId: string, visitDate: string) {
  const visits = campsiteVisits.get(villagerId);
  visits?.delete(visitDate);
}

export function createIsland(input: IslandInput) {
  const id = createId('island');
  islands = islands.map((island) => ({ ...island, isActive: false }));
  islands.push({
    id,
    name: input.name,
    fruit: input.fruit,
    flower: input.flower,
    hemisphere: input.hemisphere,
    timezone: input.timezone,
    playerName: input.playerName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
  });
  return id;
}

export function seedInitialIslandIfNeeded() {
  if (islands.length === 0) {
    createIsland(TEST_ISLAND);
  }
}
