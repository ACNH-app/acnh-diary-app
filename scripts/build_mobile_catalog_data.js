const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const seedRoot = path.join(root, 'dataset/app-ready/seed/supabase_seed');
const outputRoot = path.join(root, 'acnh-diary-mobile/src/data/content/catalog');
const assetManifestPath = path.join(
  root,
  'dataset/app-ready/manifests/offline_asset_manifests/catalog_asset_paths.json',
);

const categoryDefinitions = [
  { key: 'furniture', label: '가구' },
  { key: 'interior', label: '인테리어' },
  { key: 'clothing', label: '옷' },
  { key: 'music', label: '음악' },
  { key: 'items', label: '잡화' },
  { key: 'tools', label: '도구' },
  { key: 'special_items', label: '특수 아이템' },
  { key: 'gyroids', label: '토용' },
  { key: 'photos', label: '사진·포스터' },
  { key: 'recipes', label: '레시피' },
  { key: 'reactions', label: '리액션' },
];

const categoryLabels = {
  Tops: '상의',
  Accessories: '액세서리',
  Umbrellas: '우산',
  Bags: '가방',
  Shoes: '신발',
  Headwear: '모자',
  Bottoms: '하의',
  'Dress-Up': '원피스',
  Socks: '양말',
  Other: '기타',
  Miscellaneous: '잡화',
  Housewares: '가구',
  'Wall-mounted': '벽걸이',
  'Ceiling decor': '천장',
  'Ceiling Decor': '천장',
  Rugs: '러그',
  Floors: '바닥',
  Wallpaper: '벽지',
  Savory: '요리',
  Sweet: '디저트',
  Interior: '인테리어',
  Equipment: '장비',
  Tools: '도구',
  Reactions: '리액션',
  Music: '음악',
  Photos: '사진',
  Posters: '포스터',
};

const furnitureNameFallbacks = {
  'leaf statue': '나뭇잎 조각상',
  'wood partition': '목제 파티션',
  'wood-plank table': '원목 테이블',
  'wood-shade lamp': '목제 갓 램프',
  'wooden box': '목제 상자',
  'wooden field sign': '목제 밭 표지판',
  'wooden locker': '목제 로커',
  'wooden music box': '목제 오르골',
  'wooden pendant light': '목제 펜던트 조명',
  'wooden storage shed': '목제 수납 창고',
  wristwatch: '손목시계',
  yacht: '요트',
  'yoga mat': '요가 매트',
  'yunomi teacup': '유노미 찻잔',
  'zen bench': '선풍 벤치',
  'zen light': '선풍 조명',
  'zen low table': '선풍 낮은 테이블',
  'zen lowboard': '선풍 로보드',
  'zodiac boar figurine': '멧돼지띠 장식품',
  'zodiac dog figurine': '개띠 장식품',
  'zodiac dragon figurine': '용띠 장식품',
  'zodiac horse figurine': '말띠 장식품',
  'zodiac monkey figurine': '원숭이띠 장식품',
  'zodiac pig figurine': '돼지띠 장식품',
  'zodiac rabbit figurine': '토끼띠 장식품',
  'zodiac rat figurine': '쥐띠 장식품',
  'zodiac rooster figurine': '닭띠 장식품',
  'zodiac sheep figurine': '양띠 장식품',
  'zodiac snake figurine': '뱀띠 장식품',
  'zodiac tiger figurine': '호랑이띠 장식품',
  'Zonai authentication crest': '조나이 인증 문장',
};

const detailValueLabels = {
  'All year': '연중',
  Spring: '봄',
  Summer: '여름',
  Autumn: '가을',
  Winter: '겨울',
  'Living room': '거실',
  'Child\'s room': '아이 방',
  Facility: '시설',
  Fancy: '화려한',
  Party: '파티',
  Garden: '정원',
  Harmonious: '조화로운',
  Simple: '심플',
  TV: 'TV',
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseJson(value) {
  if (!value) return {};
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return {};
  }
}

function meaningful(value) {
  if (value == null || value === '') return false;
  return !Array.isArray(value) || value.length > 0;
}

function addDetail(details, key, value) {
  if (meaningful(value)) details[key] = value;
}

function localizeDetailValue(value) {
  if (Array.isArray(value)) return value.map(localizeDetailValue);
  if (typeof value === 'string') return detailValueLabels[value] || value;
  return value;
}

function localizeCategory(value, fallback) {
  return categoryLabels[value] || value || fallback;
}

function normalizeSeasonality(value) {
  if (value === 'All year' || value === 'all_year') return '연중';
  return value;
}

function formatMaterials(materials, itemNameMap) {
  if (!materials || typeof materials !== 'object') return null;
  const entries = Array.isArray(materials)
    ? materials.map((material) => [material.name, material.count])
    : Object.entries(materials);
  return entries.filter(([name, count]) => name && count != null).map(([name, count]) => {
    const localizedName = itemNameMap[name] || itemNameMap[name.toLowerCase()] || name;
    return `${localizedName} × ${count}`;
  });
}

function normalizeRecipeFilters(filters) {
  if (!Array.isArray(filters)) return filters;
  return filters.map((value) => {
    const normalized = String(value);
    return normalized.startsWith('npc:') ? `event:${normalized.slice(4)}` : normalized;
  });
}

function getBuyCurrency(raw) {
  const currency = Array.isArray(raw.buy) ? raw.buy[0]?.currency : null;
  const currencyCodes = {
    Bells: 'bells',
    'Nook Miles': 'nook_miles',
    Poki: 'poki',
    'Heart Crystals': 'heart_crystals',
    'Hotel Tickets': 'hotel_tickets',
    'Nook Points': 'nook_points',
  };
  return currencyCodes[currency] || null;
}

function buildDetails(item, raw, itemJson, itemNameMap) {
  const details = {};
  const styles = itemJson.styles_ko || raw.styles_ko || raw.styles;
  const themes = itemJson.label_themes_ko || raw.label_themes_ko || raw.themes;
  const colors = raw.colors || raw.color;
  const series = raw.item_series || raw.series;
  const size = raw.size || (
    raw.grid_width && raw.grid_length ? `${raw.grid_width}×${raw.grid_length}` : null
  );

  addDetail(details, 'styles', styles);
  addDetail(details, 'themes', localizeDetailValue(themes));
  addDetail(details, 'colors', localizeDetailValue(colors));
  addDetail(details, 'seasonality', localizeDetailValue(normalizeSeasonality(raw.seasonality || raw.seasonality_key)));
  addDetail(details, 'series', localizeDetailValue(series));
  addDetail(details, 'tag', localizeDetailValue(raw.tag));
  addDetail(details, 'size', size);
  addDetail(details, 'stackSize', raw.stack || raw.stackSize);
  addDetail(details, 'recipeCategory', item.catalog_type === 'recipes' ? localizeCategory(raw.category, raw.category) : null);
  addDetail(details, 'materials', formatMaterials(raw.materials, itemNameMap));
  addDetail(details, 'diy', raw.diy ?? raw.isDIY ?? itemJson.diy);
  addDetail(details, 'interactable', raw.interact ?? raw.isInteractive ?? itemJson.interactable);
  addDetail(details, 'outdoor', raw.outdoor ?? raw.isOutdoor);
  addDetail(details, 'orderable', raw.isOrderable ?? itemJson.is_orderable);
  addDetail(details, 'customizable', raw.customizable ?? raw.isCustomizable);
  addDetail(details, 'functions', localizeDetailValue(raw.functions));
  addDetail(details, 'lucky', raw.lucky);
  addDetail(details, 'version', raw.versionAdded || raw.version_added || itemJson.version_added);
  addDetail(details, 'seasonEvent', raw.seasonEvent || raw.season_event);
  addDetail(details, 'eventExclusive', raw.seasonEventExclusive ?? raw.season_event_exclusive);
  addDetail(details, 'recipeUnlocks', raw.recipesToUnlock ?? itemJson.recipes_to_unlock);
  addDetail(details, 'recipeFilters', item.catalog_type === 'recipes' ? normalizeRecipeFilters(itemJson.recipe_filters) : null);
  return details;
}

function createAssetResolver(assetManifest) {
  const keys = new Set(
    assetManifest.assets
      .filter((asset) => asset.source_manifest?.includes('catalog'))
      .map((asset) => `${asset.catalog_type}/${asset.item_id}/${asset.variation_id ?? ''}`),
  );

  function has(type, itemId, variationId = null) {
    return keys.has(`${type}/${itemId}/${variationId ?? ''}`);
  }

  function resolve(type, itemId, variationId = null, musicNumber = null) {
    if (type === 'music') {
      return musicNumber == null ? null : { assetType: 'music', assetId: String(musicNumber) };
    }

    const candidates = [type];
    if (type === 'special_items') candidates.push('items', 'furniture');
    if (type === 'furniture') candidates.push('special_items', 'items');
    for (const candidate of candidates) {
      if (has(candidate, itemId, variationId)) {
        return { assetType: candidate, assetId: itemId };
      }
    }
    return null;
  }

  return { resolve };
}

function normalizeItem(item, categoryMap, furnitureNameMap, assetResolver, itemNameMap) {
  const itemJson = parseJson(item.item_json);
  const raw = parseJson(item.raw_json);
  const categoryLabel = localizeCategory(item.category_ko, localizeCategory(item.category, categoryMap[item.catalog_type]));
  const nameKo = item.name_ko || furnitureNameMap[item.name_en] || furnitureNameFallbacks[item.name_en] || item.name_en;
  const asset = assetResolver.resolve(item.catalog_type, item.item_id, null, item.number);
  const buy = Number(item.buy);
  const sell = Number(item.sell);

  return {
    id: item.item_id,
    catalogType: item.catalog_type,
    nameKo,
    nameEn: item.name_en || item.name || nameKo,
    classification: categoryLabel,
    source: item.source_ko || item.source || null,
    sourceNotes: item.source_notes_ko || item.source_notes || null,
    buyPrice: Number.isFinite(buy) && buy > 0 ? buy : null,
    buyCurrency: getBuyCurrency(raw),
    sellPrice: Number.isFinite(sell) && sell > 0 ? sell : null,
    number: Number(item.number) > 0 ? Number(item.number) : null,
    eventType: item.event_type || null,
    date: item.date || null,
    imageUrl: item.image_url || null,
    notForSale: Boolean(item.not_for_sale),
    variationCount: Number(item.variation_total) || 0,
    assetType: asset?.assetType || null,
    assetId: asset?.assetId || null,
    details: buildDetails(item, raw, itemJson, itemNameMap),
  };
}

function normalizeVariation(variation, assetResolver) {
  const asset = assetResolver.resolve(variation.catalog_type, variation.item_id, variation.variation_id);
  return {
    catalogType: variation.catalog_type,
    itemId: variation.item_id,
    id: String(variation.variation_id),
    label: variation.label || null,
    color1: variation.color1 || null,
    color2: variation.color2 || null,
    pattern: variation.pattern || null,
    price: Number(variation.price) > 0 ? Number(variation.price) : null,
    imageUrl: variation.image_url || null,
    assetType: asset?.assetType || null,
    assetId: asset?.assetId || null,
  };
}

const items = readJson(path.join(seedRoot, 'content_db/catalog_items.json'));
const variations = readJson(path.join(seedRoot, 'content_db/catalog_variations.json'));
const assetManifest = readJson(assetManifestPath);
const furnitureNameMap = readJson(path.join(root, 'dataset/app-ready/content/catalog/furniture/furniture_name_map_ko.json'));
const itemNameMap = readJson(path.join(root, 'dataset/app-ready/content/catalog/special-items/items_name_map_ko.json'));
const localizationSnapshot = readJson(path.join(root, 'dataset/app-ready/content/localization/text_data_snapshot.json'));
const materialNameMap = {
  ...(localizationSnapshot.name_maps_ko?.items || {}),
  ...itemNameMap,
};
const wanted = new Set(categoryDefinitions.map((category) => category.key));
const categoryMap = Object.fromEntries(categoryDefinitions.map((category) => [category.key, category.label]));
const assetResolver = createAssetResolver(assetManifest);

const normalizedItems = items
  .filter((item) => wanted.has(item.catalog_type))
  .map((item) => normalizeItem(item, categoryMap, furnitureNameMap, assetResolver, materialNameMap))
  .sort((left, right) =>
    left.catalogType.localeCompare(right.catalogType) ||
    left.nameKo.localeCompare(right.nameKo, 'ko') ||
    left.id.localeCompare(right.id),
  );

const normalizedVariations = variations
  .filter((variation) => wanted.has(variation.catalog_type))
  .map((variation) => normalizeVariation(variation, assetResolver))
  .sort((left, right) =>
    left.catalogType.localeCompare(right.catalogType) ||
    left.itemId.localeCompare(right.itemId) ||
    left.id.localeCompare(right.id),
  );

const categories = categoryDefinitions.map((category) => ({
  ...category,
  itemCount: normalizedItems.filter((item) => item.catalogType === category.key).length,
  variationCount: normalizedVariations.filter((item) => item.catalogType === category.key).length,
}));

fs.mkdirSync(outputRoot, { recursive: true });
fs.writeFileSync(
  path.join(outputRoot, 'catalog.json'),
  `${JSON.stringify({ schemaVersion: 1, categories, items: normalizedItems }, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(outputRoot, 'catalog-variations.json'),
  `${JSON.stringify({ schemaVersion: 1, variations: normalizedVariations }, null, 2)}\n`,
);

console.log(`Built ${normalizedItems.length} catalog items and ${normalizedVariations.length} variations.`);
for (const category of categories) {
  console.log(`${category.key}: ${category.itemCount} items, ${category.variationCount} variations`);
}
