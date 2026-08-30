export type Hemisphere = 'north' | 'south';

export type IslandInput = {
  name: string;
  fruit: string;
  flower: string;
  hemisphere: Hemisphere;
  timezone: string;
  playerName: string;
  birthdayMonth?: number;
  birthdayDay?: number;
};

export type Island = {
  id: string;
  name: string;
  fruit: string | null;
  flower: string | null;
  hemisphere: Hemisphere | null;
  timezone: string | null;
  playerName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isActive: boolean;
};

export type PlayerProfile = {
  islandId: string;
  name: string;
  birthdayMonth: number | null;
  birthdayDay: number | null;
};

export type Routine = {
  id: string;
  islandId: string;
  title: string;
  goalCount: number;
  repeatType: 'daily';
  createdAt: string | null;
};

export type RoutineProgress = {
  currentCount: number;
  isComplete: boolean;
};

export type NpcVisit = {
  islandId: string;
  visitDate: string;
  npcName: string;
};
