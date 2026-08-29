export type Hemisphere = 'north' | 'south';

export type IslandInput = {
  name: string;
  fruit: string;
  flower: string;
  hemisphere: Hemisphere;
  timezone: string;
  playerName: string;
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

export type Routine = {
  id: string;
  islandId: string;
  title: string;
  goalCount: number;
  repeatType: 'daily';
  createdAt: string | null;
};
