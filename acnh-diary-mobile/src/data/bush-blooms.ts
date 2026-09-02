import type { ImageSourcePropType } from 'react-native';

import { plantAssets } from './plant-assets';
import type { Island } from '@/types/island';

type Hemisphere = Island['hemisphere'];
type MonthDayWindow = readonly [number, number];
type BushVariant = {
  id: string;
  nameKo: string;
  nameEn: string;
  catalogItemId: string;
  assetKey: string;
};

export type BushBloom = {
  id: string;
  nameKo: string;
  nameEn: string;
  bloomWindows: Record<'north' | 'south', readonly MonthDayWindow[]>;
  representativeVariantId: string;
  variants: readonly BushVariant[];
  source: 'Nookipedia Bush';
  sourceUrl: string;
};

export type BloomingBush = BushBloom & {
  icon: ImageSourcePropType;
  representativeVariant: BushVariant;
};

const SOURCE_URL = 'https://nookipedia.com/wiki/Bush';

export const bushBlooms: readonly BushBloom[] = [
  {
    id: 'camellia',
    nameKo: '동백',
    nameEn: 'camellia',
    bloomWindows: { north: [[101, 331]], south: [[616, 930]] },
    representativeVariantId: 'red-camellia',
    source: 'Nookipedia Bush',
    sourceUrl: SOURCE_URL,
    variants: [
      { id: 'red-camellia', nameKo: '빨간 동백 묘목', nameEn: 'red-camellia start', catalogItemId: '693df8a8a5f75aac', assetKey: 'bush-start/red-camellia' },
      { id: 'pink-camellia', nameKo: '핑크색 동백 묘목', nameEn: 'pink-camellia start', catalogItemId: 'cef913414ed21129', assetKey: 'bush-start/pink-camellia' },
    ],
  },
  {
    id: 'azalea',
    nameKo: '진달래',
    nameEn: 'azalea',
    bloomWindows: { north: [[411, 531]], south: [[1011, 1130]] },
    representativeVariantId: 'pink-azalea',
    source: 'Nookipedia Bush',
    sourceUrl: SOURCE_URL,
    variants: [
      { id: 'pink-azalea', nameKo: '핑크색 진달래 묘목', nameEn: 'pink-azalea start', catalogItemId: '04a58853f4bc17d9', assetKey: 'bush-start/pink-azalea' },
      { id: 'white-azalea', nameKo: '하얀 진달래 묘목', nameEn: 'white-azalea start', catalogItemId: '4a9a553f06ff28c8', assetKey: 'bush-start/white-azalea' },
    ],
  },
  {
    id: 'hydrangea',
    nameKo: '수국',
    nameEn: 'hydrangea',
    bloomWindows: { north: [[601, 720]], south: [[1201, 120]] },
    representativeVariantId: 'blue-hydrangea',
    source: 'Nookipedia Bush',
    sourceUrl: SOURCE_URL,
    variants: [
      { id: 'blue-hydrangea', nameKo: '파란 수국 묘목', nameEn: 'blue-hydrangea start', catalogItemId: '37ec7718ad45eaab', assetKey: 'bush-start/blue-hydrangea' },
      { id: 'pink-hydrangea', nameKo: '핑크색 수국 묘목', nameEn: 'pink-hydrangea start', catalogItemId: 'c3dbc8a96268bb90', assetKey: 'bush-start/pink-hydrangea' },
    ],
  },
  {
    id: 'plumeria',
    nameKo: '플루메리아',
    nameEn: 'plumeria',
    bloomWindows: { north: [[601, 920]], south: [[1201, 320]] },
    representativeVariantId: 'pink-plumeria',
    source: 'Nookipedia Bush',
    sourceUrl: SOURCE_URL,
    variants: [
      { id: 'pink-plumeria', nameKo: '핑크색 플루메리아 묘목', nameEn: 'pink-plumeria start', catalogItemId: '5f0d14d868d0404d', assetKey: 'bush-start/pink-plumeria' },
      { id: 'white-plumeria', nameKo: '하얀 플루메리아 묘목', nameEn: 'white-plumeria start', catalogItemId: '2624ee149b04811d', assetKey: 'bush-start/white-plumeria' },
    ],
  },
  {
    id: 'hibiscus',
    nameKo: '히비스커스',
    nameEn: 'hibiscus',
    bloomWindows: { north: [[721, 920]], south: [[121, 320]] },
    representativeVariantId: 'red-hibiscus',
    source: 'Nookipedia Bush',
    sourceUrl: SOURCE_URL,
    variants: [
      { id: 'red-hibiscus', nameKo: '빨간 히비스커스 묘목', nameEn: 'red-hibiscus start', catalogItemId: 'd0bb45df9e94958b', assetKey: 'bush-start/red-hibiscus' },
      { id: 'yellow-hibiscus', nameKo: '노란 히비스커스 묘목', nameEn: 'yellow-hibiscus start', catalogItemId: '11d3141ed7f7b02d', assetKey: 'bush-start/yellow-hibiscus' },
    ],
  },
  {
    id: 'tea-olive',
    nameKo: '금목서',
    nameEn: 'tea olive',
    bloomWindows: { north: [[921, 1031]], south: [[321, 430]] },
    representativeVariantId: 'orange-tea-olive',
    source: 'Nookipedia Bush',
    sourceUrl: SOURCE_URL,
    variants: [
      { id: 'orange-tea-olive', nameKo: '오렌지색 금목서 묘목', nameEn: 'orange-tea-olive start', catalogItemId: '60cd48a71fe8d864', assetKey: 'bush-start/orange-tea-olive' },
      { id: 'yellow-tea-olive', nameKo: '노란 금목서 묘목', nameEn: 'yellow-tea-olive start', catalogItemId: '29601c609aab2a19', assetKey: 'bush-start/yellow-tea-olive' },
    ],
  },
  {
    id: 'holly',
    nameKo: '호랑가시나무',
    nameEn: 'holly',
    bloomWindows: { north: [[1101, 1231]], south: [[501, 615]] },
    representativeVariantId: 'holly',
    source: 'Nookipedia Bush',
    sourceUrl: SOURCE_URL,
    variants: [
      { id: 'holly', nameKo: '호랑가시나무 묘목', nameEn: 'holly start', catalogItemId: '47f553be35d2a20c', assetKey: 'bush-start/holly' },
    ],
  },
];

function monthDayKey(month: number, day: number) {
  return month * 100 + day;
}

function isMonthDayInRange(month: number, day: number, start: number, end: number) {
  const key = monthDayKey(month, day);
  return start <= end ? key >= start && key <= end : key >= start || key <= end;
}

export function getBloomingBushes(month: number, day: number, hemisphere: Hemisphere): BloomingBush[] {
  const side = hemisphere === 'south' ? 'south' : 'north';

  return bushBlooms
    .filter((bush) => bush.bloomWindows[side].some(([start, end]) => isMonthDayInRange(month, day, start, end)))
    .map((bush) => {
      const representativeVariant = bush.variants.find((variant) => variant.id === bush.representativeVariantId) ?? bush.variants[0];
      return {
        ...bush,
        icon: plantAssets[representativeVariant.assetKey],
        representativeVariant,
      };
    })
    .filter((bush): bush is BloomingBush => Boolean(bush.representativeVariant && bush.icon));
}
