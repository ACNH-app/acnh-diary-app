import type { ImageSourcePropType } from 'react-native';

import { catalogItems, getCatalogAssetForItem } from './catalog';
import { encyclopediaItems } from './encyclopedia';
import { getEncyclopediaAsset } from './encyclopedia-assets';
import { npcAssets } from './npc-assets';

const ROUTINE_ICON_OVERRIDES: Record<string, ImageSourcePropType> = {
  '메시지 보틀': require('./assets/icons/message-bottle.png'),
  돈나무: require('./assets/icons/money-tree-inventory.png'),
  '나무 흔들기 · 동전': require('./assets/icons/coin-inventory.png'),
  '나무 흔들기 · 가구': require('./assets/icons/leaf.png'),
  선물주기: require('./assets/icons/wrapping-paper-present.png'),
  '너굴포트 출석': require('./assets/icons/nook-stop.png'),
};

type CatalogLookup = {
  catalogType: string;
  nameEn: string;
};

type EncyclopediaLookup = {
  category: string;
  nameEn: string;
};

const ROUTINE_CATALOG_LOOKUPS: Record<string, CatalogLookup> = {
  바위치기: { catalogType: 'items', nameEn: 'stone' },
  '화석 캐기': { catalogType: 'items', nameEn: 'fossil' },
  '주민 레시피': { catalogType: 'items', nameEn: 'Basic Cooking Recipes' },
  '잠수해서 진주 캐기': { catalogType: 'items', nameEn: 'pearl' },
};

const ROUTINE_ENCYCLOPEDIA_LOOKUPS: Record<string, EncyclopediaLookup> = {
  '나무 흔들기 · 벌': { category: 'bugs', nameEn: 'wasp' },
};

const ROUTINE_NPC_LOOKUPS: Record<string, string> = {
  '옷가게 방문': 'mabel',
  '해탈한 교환': 'pascal',
  갑돌보: 'kappn',
  '마추릴라 · 우정 확인': 'katrina',
  '마추릴라 · 오늘의 운세': 'katrina',
};

function findCatalogAsset(lookup: CatalogLookup) {
  const item = catalogItems.find((candidate) => candidate.catalogType === lookup.catalogType && candidate.nameEn === lookup.nameEn);
  return item ? getCatalogAssetForItem(item) : undefined;
}

function findEncyclopediaAsset(lookup: EncyclopediaLookup) {
  const item = encyclopediaItems.find((candidate) => candidate.category === lookup.category && candidate.nameEn === lookup.nameEn);
  return item ? getEncyclopediaAsset(item.category, item.id) : undefined;
}

export function getRoutineIconSource(title: string): ImageSourcePropType | undefined {
  const directAsset = ROUTINE_ICON_OVERRIDES[title];
  if (directAsset) return directAsset;

  const catalogLookup = ROUTINE_CATALOG_LOOKUPS[title];
  if (catalogLookup) return findCatalogAsset(catalogLookup);

  const encyclopediaLookup = ROUTINE_ENCYCLOPEDIA_LOOKUPS[title];
  if (encyclopediaLookup) return findEncyclopediaAsset(encyclopediaLookup);

  const npcKey = ROUTINE_NPC_LOOKUPS[title];
  return npcKey ? npcAssets[npcKey]?.icon : undefined;
}
