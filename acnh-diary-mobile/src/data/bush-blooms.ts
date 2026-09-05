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
      { id: 'red-camellia', nameKo: '빨간 동백나무', nameEn: 'red camellia bush', catalogItemId: 'dbd041fbae7a1048', assetKey: 'bush/red-camellia' },
      { id: 'pink-camellia', nameKo: '핑크색 동백나무', nameEn: 'pink camellia bush', catalogItemId: 'fc9eaad5f42c94ec', assetKey: 'bush/pink-camellia' },
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
      { id: 'pink-azalea', nameKo: '핑크색 진달래나무', nameEn: 'pink azalea bush', catalogItemId: 'cba75d2212d50e19', assetKey: 'bush/pink-azalea' },
      { id: 'white-azalea', nameKo: '하얀 진달래나무', nameEn: 'white azalea bush', catalogItemId: '3aa84e643508de73', assetKey: 'bush/white-azalea' },
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
      { id: 'blue-hydrangea', nameKo: '파란 수국나무', nameEn: 'blue hydrangea bush', catalogItemId: 'de7537179a5ff721', assetKey: 'bush/blue-hydrangea' },
      { id: 'pink-hydrangea', nameKo: '핑크색 수국나무', nameEn: 'pink hydrangea bush', catalogItemId: '82b419180cee3778', assetKey: 'bush/pink-hydrangea' },
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
      { id: 'pink-plumeria', nameKo: '핑크색 플루메리아나무', nameEn: 'pink plumeria bush', catalogItemId: '60bd77f9a362ecf5', assetKey: 'bush/pink-plumeria' },
      { id: 'white-plumeria', nameKo: '하얀 플루메리아나무', nameEn: 'white plumeria bush', catalogItemId: 'f439d195ecb105ca', assetKey: 'bush/white-plumeria' },
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
      { id: 'red-hibiscus', nameKo: '빨간 히비스커스나무', nameEn: 'red hibiscus bush', catalogItemId: 'd930ce8c10b5e406', assetKey: 'bush/red-hibiscus' },
      { id: 'yellow-hibiscus', nameKo: '노란 히비스커스나무', nameEn: 'yellow hibiscus bush', catalogItemId: '2f60cef80a713562', assetKey: 'bush/yellow-hibiscus' },
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
      { id: 'orange-tea-olive', nameKo: '오렌지색 금목서나무', nameEn: 'orange tea olive bush', catalogItemId: 'a29900794a428322', assetKey: 'bush/orange-tea-olive' },
      { id: 'yellow-tea-olive', nameKo: '노란 금목서나무', nameEn: 'yellow tea olive bush', catalogItemId: '3f81ac87aec33a91', assetKey: 'bush/yellow-tea-olive' },
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
      { id: 'holly', nameKo: '호랑가시나무', nameEn: 'holly bush', catalogItemId: '839132089b3d8f52', assetKey: 'bush/holly' },
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
