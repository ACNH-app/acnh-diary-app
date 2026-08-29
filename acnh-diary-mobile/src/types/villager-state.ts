export type VillagerStatus =
  | 'wishlist'
  | 'campsiteVisited'
  | 'islandResident'
  | 'movedOut'
  | 'photoReceived'
  | 'posterOwned';

export type VillagerState = Record<VillagerStatus, boolean>;

export const EMPTY_VILLAGER_STATE: VillagerState = {
  wishlist: false,
  campsiteVisited: false,
  islandResident: false,
  movedOut: false,
  photoReceived: false,
  posterOwned: false,
};
