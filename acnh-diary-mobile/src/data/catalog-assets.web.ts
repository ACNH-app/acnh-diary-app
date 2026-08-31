import type { ImageSourcePropType } from 'react-native';

export const catalogAssets: Record<string, ImageSourcePropType> = {};

export function catalogAssetKey(
  catalogType: string,
  itemId: string,
  variationId?: string | number | null,
): string {
  return variationId == null
    ? `${catalogType}/${itemId}`
    : `${catalogType}/${itemId}/${variationId}`;
}

export function getCatalogAsset(
  catalogType: string,
  itemId: string,
  variationId?: string | number | null,
): ImageSourcePropType | undefined {
  return catalogAssets[catalogAssetKey(catalogType, itemId, variationId)];
}
