import { musicImageAssets } from './music-assets';
import { catalogAssets, getCatalogAsset } from './catalog-assets';
import type {
  CatalogCategory,
  CatalogCategoryDefinition,
  CatalogFilterFacet,
  CatalogFilterOption,
  CatalogItem,
  CatalogSubcategoryDefinition,
  CatalogVariant,
} from '@/types/catalog';

type CatalogData = {
  schemaVersion: number;
  categories: CatalogCategoryDefinition[];
  items: CatalogItem[];
};

type CatalogVariationData = {
  schemaVersion: number;
  variations: CatalogVariant[];
};

const data = require('./content/catalog/catalog.json') as CatalogData;
const variationData = require('./content/catalog/catalog-variations.json') as CatalogVariationData;

const seasonalRecipeItems = data.items.filter((item) => {
  if (item.catalogType !== 'recipes') return false;
  const filters = item.details.recipeFilters;
  return Array.isArray(filters) && filters.some((filter) => {
    const prefix = String(filter).split(':', 1)[0];
    return prefix === 'season' || prefix === 'event';
  });
});

const itemsByCategory = data.categories.reduce<Record<CatalogCategory, CatalogItem[]>>(
  (result, category) => {
    result[category.key] = data.items.filter((item) => item.catalogType === category.key);
    return result;
  },
  {} as Record<CatalogCategory, CatalogItem[]>,
);
itemsByCategory.seasonal_recipes = seasonalRecipeItems;

const variationsByItem = variationData.variations.reduce<Record<string, CatalogVariant[]>>(
  (result, variation) => {
    const key = `${variation.catalogType}/${variation.itemId}`;
    (result[key] ??= []).push(variation);
    return result;
  },
  {},
);

export const catalogCategories = data.categories;
export const catalogItems = data.items;

export const catalogCategoryDescriptions: Record<CatalogCategory, string> = {
  furniture: '방과 섬을 꾸미는 가구',
  interior: '집 안을 완성하는 인테리어',
  clothing: '매일 입을 수 있는 의상과 소품',
  music: '집에서 감상하는 K.K. 음악',
  items: '생활에 쓰는 다양한 기타 아이템',
  tools: '섬 생활에 필요한 도구',
  special_items: '특별한 방법으로 얻는 아이템',
  gyroids: '수집하고 꾸미는 토용',
  photos: '주민 사진과 포스터',
  recipes: '요리와 DIY 레시피',
  seasonal_recipes: '시즌과 이벤트로 얻는 레시피',
  reactions: '표현을 풍부하게 하는 리액션',
};

export const catalogFilterFacetLabels: Record<CatalogFilterFacet, string> = {
  styles: '스타일',
  themes: '테마',
  colors: '색상',
  seasonality: '시즌',
  series: '시리즈',
  tag: '분류 태그',
  size: '크기',
  functions: '기능',
  customizable: '리폼 가능 여부',
  lucky: '행운 아이템 여부',
  orderable: '주문 가능 여부',
  source: '입수처',
  recipeSeason: '시즌 레시피',
  recipeEvent: '이벤트 레시피',
  recipeMaterial: '재료별 레시피',
};

export const catalogFilterFacets: CatalogFilterFacet[] = [
  'styles',
  'themes',
  'colors',
  'seasonality',
  'series',
  'tag',
  'size',
  'functions',
  'customizable',
  'lucky',
  'orderable',
  'source',
  'recipeSeason',
  'recipeEvent',
  'recipeMaterial',
];

const recipeFilterLabels: Record<string, string> = {
  young_spring_bamboo: '봄의 대나무',
  cherry_blossom: '벚꽃',
  summer_shell: '여름 조개껍데기',
  mushroom: '버섯',
  maple_leaf: '단풍잎',
  tree_bounty: '도토리/솔방울',
  winter_snowflake: '눈의 결정',
  christmas_ornament: '크리스마스 오너먼트',
  bunny_day: '이스터',
  festivale: '카니발',
  wedding_season: '웨딩시즌',
  halloween: '할로윈',
  turkey_day: '추수감사절',
  celeste: '부옥이',
  pascal: '머메이드',
  flower: '꽃',
  fruit: '과일',
  shell_non_mermaid: '조개(머메이드 제외)',
  vine_moss: '덩굴/빛이끼',
};

const recipeTabFilters = [
  'season:young_spring_bamboo',
  'season:cherry_blossom',
  'season:summer_shell',
  'season:mushroom',
  'season:maple_leaf',
  'season:tree_bounty',
  'season:winter_snowflake',
  'season:christmas_ornament',
  'event:bunny_day',
  'event:festivale',
  'event:wedding_season',
  'event:halloween',
  'event:turkey_day',
  'event:celeste',
  'event:pascal',
] as const;

const orderedSubcategories: Partial<Record<CatalogCategory, Array<{ label: string; values: string[] }>>> = {
  furniture: [
    { label: '가구', values: ['가구'] },
    { label: '잡화', values: ['잡화'] },
    { label: '벽걸이', values: ['벽걸이'] },
    { label: '천장', values: ['천장'] },
  ],
  interior: [
    { label: '바닥', values: ['바닥'] },
    { label: '러그', values: ['러그'] },
    { label: '벽지', values: ['벽지'] },
  ],
  clothing: [
    { label: '상의', values: ['상의'] },
    { label: '하의', values: ['하의'] },
    { label: '원피스/코스튬', values: ['원피스/코스튬'] },
    { label: '모자', values: ['모자'] },
    { label: '액세서리', values: ['액세서리'] },
    { label: '양말', values: ['양말'] },
    { label: '신발', values: ['신발'] },
    { label: '가방', values: ['가방'] },
    { label: '우산', values: ['우산'] },
    { label: '기타(잠수복)', values: ['기타'] },
  ],
  music: [{ label: '음악', values: ['음악'] }],
  items: [{ label: '잡화', values: ['잡화'] }],
  tools: [{ label: '도구', values: ['도구'] }],
  special_items: [
    { label: '죠니', values: ['죠니'] },
    { label: '해적죠니', values: ['해적 죠니'] },
    { label: '레온', values: ['레온', '레온(곤충대회)'] },
    { label: '저스틴', values: ['저스틴', '저스틴(낚시대회)'] },
    { label: '재활용함', values: ['재활용함'] },
    { label: '엄마', values: ['엄마'] },
    { label: '생일 이벤트', values: ['생일'] },
    { label: '크리스마스 이벤트 - 루돌', values: ['루돌'] },
    { label: '카니발 이벤트 - 베르리나', values: ['카니발'] },
    { label: '웨딩시즌 이벤트 - 리사', values: ['웨딩 시즌'] },
    { label: '해탈한', values: ['해탈한'] },
    { label: '할로윈 이벤트 - 펌킹', values: ['할로윈'] },
    { label: '추수감사절 이벤트 - 프랭클', values: ['추수감사절'] },
    { label: '불꽃놀이 이벤트 - 여울', values: ['불꽃놀이'] },
  ],
  gyroids: [{ label: '토용', values: ['토용'] }],
  photos: [
    { label: '액자 사진', values: ['사진'] },
    { label: '포스터', values: ['포스터'] },
  ],
  recipes: [
    { label: '도구', values: ['도구'] },
    { label: '가구', values: ['가구'] },
    { label: '잡화', values: ['잡화'] },
    { label: '벽걸이', values: ['벽걸이'] },
    { label: '천장', values: ['천장'] },
    { label: '벽지/바닥/러그', values: ['벽지/바닥/러그'] },
    { label: '의류', values: ['의류'] },
    { label: '기타', values: ['기타'] },
    { label: '푸드', values: ['푸드'] },
    { label: '디저트', values: ['디저트'] },
  ],
  reactions: [{ label: '리액션', values: ['리액션'] }],
};

function getCatalogFilterValues(item: CatalogItem, facet: CatalogFilterFacet) {
  if (facet === 'source') return item.source?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];
  if (facet === 'recipeSeason' || facet === 'recipeEvent' || facet === 'recipeMaterial') {
    const prefix = facet === 'recipeSeason' ? 'season:' : facet === 'recipeEvent' ? 'event:' : 'ingredient:';
    const filters = item.details.recipeFilters;
    if (!Array.isArray(filters)) return [];
    return filters
      .filter((value) => String(value).startsWith(prefix))
      .map((value) => String(value).slice(prefix.length));
  }
  const value = item.details[facet];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return value == null || value === '' ? [] : [String(value)];
}

export function getCatalogFilterOptionLabel(facet: CatalogFilterFacet, key: string) {
  const booleanLabels: Partial<Record<CatalogFilterFacet, Record<string, string>>> = {
    customizable: { true: '가능', false: '불가' },
    lucky: { true: '행운 아이템', false: '일반 아이템' },
    orderable: { true: '주문 가능', false: '주문 불가' },
  };
  if (booleanLabels[facet]?.[key]) return booleanLabels[facet][key];
  return facet === 'recipeSeason' || facet === 'recipeEvent' || facet === 'recipeMaterial'
    ? recipeFilterLabels[key] ?? key
    : key;
}

export function getCatalogFilterOptions(items: CatalogItem[]): Record<CatalogFilterFacet, CatalogFilterOption[]> {
  return Object.fromEntries(
    catalogFilterFacets.map((facet) => {
      const counts = new Map<string, number>();
      for (const item of items) {
        for (const value of getCatalogFilterValues(item, facet)) {
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }
      }
      const options = Array.from(counts, ([key, itemCount]) => ({ key, label: getCatalogFilterOptionLabel(facet, key), itemCount })).sort((left, right) =>
        left.label.localeCompare(right.label, 'ko'),
      );
      return [facet, options];
    }),
  ) as Record<CatalogFilterFacet, CatalogFilterOption[]>;
}

export function matchesCatalogFilter(item: CatalogItem, facet: CatalogFilterFacet, selectedValues: string[]) {
  if (selectedValues.length === 0) return true;
  return getCatalogFilterValues(item, facet).some((value) => selectedValues.includes(value));
}

export function getCatalogItems(category: CatalogCategory) {
  return itemsByCategory[category] ?? [];
}

export function getCatalogSubcategories(category: CatalogCategory): CatalogSubcategoryDefinition[] {
  if (category === 'seasonal_recipes') {
    const items = getCatalogItems(category);
    const counts = new Map<string, number>();
    for (const item of items) {
      const filters = item.details.recipeFilters;
      if (!Array.isArray(filters)) continue;
      for (const filter of filters) {
        const key = String(filter);
        if (recipeTabFilters.includes(key as (typeof recipeTabFilters)[number])) {
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
    }
    const recipeSubcategories = recipeTabFilters
      .filter((filter) => counts.has(filter))
      .map((filter) => {
        const [, value] = filter.split(':');
        return {
          key: filter,
          label: recipeFilterLabels[value] ?? value,
          itemCount: counts.get(filter) ?? 0,
          values: [],
          filterKeys: [filter],
        };
      });

    return [
      { key: 'all', label: '전체', itemCount: items.length, values: [] },
      ...recipeSubcategories,
    ];
  }

  const counts = new Map<string, number>();
  for (const item of getCatalogItems(category)) {
    const label = item.classification.trim();
    if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const configured = orderedSubcategories[category] ?? [];
  const configuredValues = new Set(configured.flatMap((subcategory) => subcategory.values));
  const subcategories = configured
    .map((subcategory) => ({
      key: subcategory.label,
      label: subcategory.label,
      values: subcategory.values,
      itemCount: subcategory.values.reduce((count, value) => count + (counts.get(value) ?? 0), 0),
    }))
    .filter((subcategory) => subcategory.itemCount > 0);
  const extra = Array.from(counts, ([label, itemCount]) => ({
    key: label,
    label,
    values: [label],
    itemCount,
  }))
    .filter((subcategory) => !configuredValues.has(subcategory.key))
    .sort((left, right) => left.label.localeCompare(right.label, 'ko'));

  const availableSubcategories = [...subcategories, ...extra];
  if (availableSubcategories.length <= 1) {
    return [{ key: 'all', label: '전체', itemCount: getCatalogItems(category).length, values: [] }];
  }

  return [
    { key: 'all', label: '전체', itemCount: getCatalogItems(category).length, values: [] },
    ...availableSubcategories,
  ];
}

export function getCatalogItem(category: CatalogCategory, itemId: string) {
  return getCatalogItems(category).find((item) => item.id === itemId) ?? null;
}

export function getCatalogVariants(item: CatalogItem) {
  return variationsByItem[`${item.catalogType}/${item.id}`] ?? [];
}

export function getCatalogAssetForItem(item: CatalogItem) {
  if (!item.assetType || !item.assetId) return undefined;
  if (item.assetType === 'music') return musicImageAssets[item.assetId];
  return getCatalogAsset(item.assetType, item.assetId);
}

export function getCatalogAssetForVariant(variant: CatalogVariant) {
  if (!variant.assetType || !variant.assetId) return undefined;
  if (variant.assetType === 'music') return musicImageAssets[variant.assetId];
  return getCatalogAsset(variant.assetType, variant.assetId, variant.id);
}

export function hasCatalogAsset(item: CatalogItem) {
  if (item.assetType === 'music') return Boolean(item.assetId && musicImageAssets[item.assetId]);
  return Boolean(item.assetType && item.assetId && catalogAssets[`${item.assetType}/${item.assetId}`]);
}
