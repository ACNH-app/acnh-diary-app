export type EncyclopediaCategory = 'bugs' | 'fish' | 'sea' | 'fossils' | 'art';

export type EncyclopediaStatus =
  | 'caught'
  | 'owned'
  | 'donated'
  | 'genuineOwned'
  | 'fakeOwned';

export type EncyclopediaAvailability = {
  label: string | null;
  months: number[];
  timesByMonth: Record<string, string>;
  periods: Array<{ months?: string; time?: string }>;
};

export type EncyclopediaItem = {
  id: string;
  category: EncyclopediaCategory;
  number: number | null;
  nameKo: string;
  nameEn: string;
  image: {
    url: string | null;
    localPath: string;
  };
  sourceUrl: string | null;
  museumPhrase: string | null;
  location: string | null;
  locationTags?: string[];
  condition?: string | null;
  rarity: string | null;
  availability: {
    north: EncyclopediaAvailability;
    south: EncyclopediaAvailability;
  };
  catchphrase: string | null;
  prices: {
    primary: number | null;
    primaryLabel: string | null;
    special: number | null;
    specialLabel: string | null;
  };
  shadow: string | null;
  movementSpeed: string | null;
  tank: {
    width: number | null;
    length: number | null;
  };
  tankImage: {
    url: string | null;
    localPath: string;
  } | null;
  fossilGroup: string | null;
  interactable: boolean | null;
  size?: {
    width: number | null;
    length: number | null;
  };
  artwork: {
    type: string | null;
    artName: string | null;
    style: string | null;
    author: string | null;
    year: string | null;
    availability: string | null;
    hasFake: boolean;
    width: number | null;
    length: number | null;
    realImageUrl: string | null;
    realImageLocalPath: string | null;
    fakeImageUrl: string | null;
    fakeImageLocalPath: string | null;
    realDescription: string | null;
    fakeDescription: string | null;
  } | null;
};

export type EncyclopediaState = {
  caught: boolean;
  owned: boolean;
  donated: boolean;
  genuineOwned: boolean;
  fakeOwned: boolean;
};
