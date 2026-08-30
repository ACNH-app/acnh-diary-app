export type CatalogCategory =
  | 'furniture'
  | 'interior'
  | 'clothing'
  | 'music'
  | 'items'
  | 'tools'
  | 'special_items'
  | 'gyroids'
  | 'photos'
  | 'recipes'
  | 'reactions';

export type CatalogDetailValue = string | number | boolean | string[];

export type CatalogCurrency =
  | 'bells'
  | 'nook_miles'
  | 'poki'
  | 'heart_crystals'
  | 'hotel_tickets'
  | 'nook_points';

export type CatalogItem = {
  id: string;
  catalogType: CatalogCategory;
  nameKo: string;
  nameEn: string;
  classification: string;
  source: string | null;
  sourceNotes: string | null;
  buyPrice: number | null;
  buyCurrency: CatalogCurrency | null;
  sellPrice: number | null;
  number: number | null;
  eventType: string | null;
  date: string | null;
  imageUrl: string | null;
  notForSale: boolean;
  variationCount: number;
  assetType: string | null;
  assetId: string | null;
  details: Record<string, CatalogDetailValue>;
};

export type CatalogVariant = {
  catalogType: CatalogCategory;
  itemId: string;
  id: string;
  label: string | null;
  color1: string | null;
  color2: string | null;
  pattern: string | null;
  price: number | null;
  imageUrl: string | null;
  assetType: string | null;
  assetId: string | null;
};

export type CatalogCategoryDefinition = {
  key: CatalogCategory;
  label: string;
  itemCount: number;
  variationCount: number;
};

export type CatalogSubcategoryDefinition = {
  key: string;
  label: string;
  itemCount: number;
  values: string[];
};

export type CatalogFilterFacet =
  | 'styles'
  | 'themes'
  | 'colors'
  | 'seasonality'
  | 'series'
  | 'source'
  | 'recipeSeason'
  | 'recipeEvent'
  | 'recipeMaterial';

export type CatalogFilterOption = {
  key: string;
  label: string;
  itemCount: number;
};
