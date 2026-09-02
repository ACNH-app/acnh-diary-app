import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const assetRoot = path.join(rootDir, 'acnh-diary-mobile', 'src', 'data');
const npcAssetDir = path.join(assetRoot, 'assets', 'npcs');
const iconDir = path.join(npcAssetDir, 'icons');
const imageDir = path.join(npcAssetDir, 'images');
const manifestPath = path.join(assetRoot, 'assets', 'npcs', 'npc-assets.manifest.json');
const tsPath = path.join(assetRoot, 'npc-assets.ts');

const userAgent = 'ACNHDiaryAssetCollector/0.1 (local development)';
const apiBase = 'https://nookipedia.com/w/api.php';
const charactersPage = 'Animal Crossing: New Horizons/Characters';
const iconSourcePage = 'Tom Nook';

const koreanNameAliases = {
  'blathers': ['부엉'],
  'brewster': ['마스터'],
  'c-j': ['저스틴'],
  'celeste': ['부옥'],
  'daisy-mae': ['무파니'],
  'flick': ['레온'],
  'isabelle': ['여울'],
  'k-k-slider': ['K.K.'],
  'kicks': ['패트릭'],
  'label': ['고숙이'],
  'leif': ['늘봉'],
  'redd': ['여욱'],
  'saharah': ['사하라'],
  'timmy-and-tommy': ['콩돌이와 밤돌이', '콩돌이', '밤돌이'],
  'tom-nook': ['너굴'],
  'wisp': ['깨빈'],
};

const iconAliases = {
  'don-resetti': ['don'],
  'dr-shrunk': ['shrunk'],
  'k-k-slider': ['k-k'],
  'lloid': ['lloid'],
  'mr-resetti': ['resetti'],
  'snowboy': ['snowboy'],
  'timmy-and-tommy': ['nookling'],
  'zipper-t-bunny': ['zipper'],
};

function apiUrl(params) {
  const url = new URL(apiBase);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

async function downloadFile(url, outputPath) {
  const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outputPath, buffer);
  return buffer.length;
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/'/g, '')
    .replace(/\./g, '-')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .toLowerCase();
}

function extractCharacters(wikitext) {
  const records = new Map();
  const tablePattern = /\[\[File:([^\]|]+)[^\]]*\]\]<br>\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const galleryPattern = /^([^|\n]+\.png)\|\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/gm;

  for (const match of wikitext.matchAll(tablePattern)) {
    const modelFile = match[1].trim();
    const pageTitle = match[2].trim();
    const nameEn = (match[3] ?? pageTitle).trim();
    const slug = slugify(nameEn);
    records.set(slug, { slug, nameEn, pageTitle, modelFile });
  }

  for (const match of wikitext.matchAll(galleryPattern)) {
    const modelFile = match[1].trim();
    const pageTitle = match[2].trim();
    const nameEn = (match[3] ?? pageTitle).trim();
    const slug = slugify(nameEn);
    records.set(slug, { slug, nameEn, pageTitle, modelFile });
  }

  return [...records.values()].sort((a, b) => a.nameEn.localeCompare(b.nameEn));
}

function iconSlugFromTitle(fileTitle) {
  const normalized = fileTitle
    .replace(/^File:/, '')
    .replace(/ (?:NH|HHD|CF|PC) Character Icon\.png$/i, '')
    .replace(/ NH Question Icon\.png$/i, '');
  return slugify(normalized);
}

function pickIconFile(record, iconFiles) {
  const candidates = new Set([
    record.slug,
    slugify(record.nameEn),
    slugify(record.pageTitle),
    ...(iconAliases[record.slug] ?? []),
  ]);

  return iconFiles.find((fileTitle) => candidates.has(iconSlugFromTitle(fileTitle))) ?? null;
}

function isUsableIconTitle(title) {
  return / Character Icon\.png$/i.test(title) || title === 'File:Lloid NH Question Icon.png';
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function getPageWikitext(page) {
  const data = await fetchJson(apiUrl({
    action: 'parse',
    page,
    prop: 'wikitext',
    format: 'json',
  }));
  return data.parse?.wikitext?.['*'] ?? '';
}

async function getPageImages(page) {
  const data = await fetchJson(apiUrl({
    action: 'query',
    titles: page,
    prop: 'images',
    imlimit: 'max',
    format: 'json',
  }));
  const pages = Object.values(data.query?.pages ?? {});
  return pages.flatMap((item) => item.images ?? []).map((item) => item.title);
}

async function getImageInfo(fileTitles) {
  const result = new Map();
  for (const batch of chunk([...new Set(fileTitles)], 40)) {
    const data = await fetchJson(apiUrl({
      action: 'query',
      titles: batch.join('|'),
      prop: 'imageinfo',
      iiprop: 'url|mime|size',
      format: 'json',
    }));
    for (const page of Object.values(data.query?.pages ?? {})) {
      const info = page.imageinfo?.[0];
      if (page.title && info?.url) {
        result.set(page.title, {
          title: page.title,
          url: info.url,
          mime: info.mime ?? '',
          width: info.width ?? null,
          height: info.height ?? null,
          size: info.size ?? null,
        });
      }
    }
  }
  return result;
}

function toRequirePath(baseDir, filePath) {
  return './' + path.relative(baseDir, filePath).replace(/\\/g, '/');
}

async function main() {
  await fs.mkdir(iconDir, { recursive: true });
  await fs.mkdir(imageDir, { recursive: true });

  const wikitext = await getPageWikitext(charactersPage);
  const characters = extractCharacters(wikitext);
  if (!characters.length) {
    throw new Error('No New Horizons special characters were parsed from Nookipedia.');
  }

  const sourceImages = await getPageImages(iconSourcePage);
  const iconFiles = sourceImages.filter(isUsableIconTitle);

  const paired = [];
  for (const character of characters) {
    let iconFile = pickIconFile(character, iconFiles);
    if (!iconFile) {
      const pageIconFiles = (await getPageImages(character.pageTitle)).filter(isUsableIconTitle);
      iconFiles.push(...pageIconFiles);
      iconFile = pickIconFile(character, iconFiles);
    }
    if (!iconFile) {
      throw new Error(`Missing icon file for ${character.nameEn}`);
    }
    paired.push({ ...character, iconFile });
  }

  const neededFiles = paired.flatMap((character) => [
    `File:${character.modelFile}`,
    character.iconFile,
  ]);
  const imageInfo = await getImageInfo(neededFiles);

  const records = [];
  for (const character of paired) {
    const iconInfo = imageInfo.get(character.iconFile);
    const modelTitle = `File:${character.modelFile}`;
    const imageInfoEntry = imageInfo.get(modelTitle);
    if (!iconInfo || !imageInfoEntry) {
      throw new Error(`Missing imageinfo for ${character.nameEn}`);
    }

    const iconPath = path.join(iconDir, `${character.slug}.png`);
    const imagePath = path.join(imageDir, `${character.slug}.png`);
    const [iconBytes, imageBytes] = await Promise.all([
      downloadFile(iconInfo.url, iconPath),
      downloadFile(imageInfoEntry.url, imagePath),
    ]);

    records.push({
      slug: character.slug,
      nameEn: character.nameEn,
      pageTitle: character.pageTitle,
      pageUrl: `https://nookipedia.com/wiki/${encodeURIComponent(character.pageTitle.replace(/ /g, '_'))}`,
      aliasesKo: koreanNameAliases[character.slug] ?? [],
      icon: {
        fileTitle: character.iconFile,
        url: iconInfo.url,
        path: path.relative(rootDir, iconPath).replace(/\\/g, '/'),
        bytes: iconBytes,
        width: iconInfo.width,
        height: iconInfo.height,
      },
      image: {
        fileTitle: modelTitle,
        url: imageInfoEntry.url,
        path: path.relative(rootDir, imagePath).replace(/\\/g, '/'),
        bytes: imageBytes,
        width: imageInfoEntry.width,
        height: imageInfoEntry.height,
      },
    });
  }

  const manifest = {
    downloadedAt: new Date().toISOString(),
    source: {
      characterList: `https://nookipedia.com/wiki/${encodeURIComponent(charactersPage.replace(/ /g, '_'))}`,
      iconSource: `https://nookipedia.com/wiki/${encodeURIComponent(iconSourcePage.replace(/ /g, '_'))}`,
    },
    count: records.length,
    records,
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  const lines = [
    "import type { ImageSourcePropType } from 'react-native';",
    '',
    'export type NpcAsset = {',
    '  nameEn: string;',
    '  pageTitle: string;',
    '  aliasesKo: string[];',
    '  icon: ImageSourcePropType;',
    '  image: ImageSourcePropType;',
    '};',
    '',
    'export const npcAssets: Record<string, NpcAsset> = {',
  ];

  for (const record of records) {
    const iconPath = path.join(assetRoot, record.icon.path.replace(/^acnh-diary-mobile\/src\/data\//, ''));
    const imagePath = path.join(assetRoot, record.image.path.replace(/^acnh-diary-mobile\/src\/data\//, ''));
    lines.push(`  ${JSON.stringify(record.slug)}: {`);
    lines.push(`    nameEn: ${JSON.stringify(record.nameEn)},`);
    lines.push(`    pageTitle: ${JSON.stringify(record.pageTitle)},`);
    lines.push(`    aliasesKo: ${JSON.stringify(record.aliasesKo)},`);
    lines.push(`    icon: require(${JSON.stringify(toRequirePath(assetRoot, iconPath))}),`);
    lines.push(`    image: require(${JSON.stringify(toRequirePath(assetRoot, imagePath))}),`);
    lines.push('  },');
  }

  lines.push('};');
  lines.push('');
  lines.push('export const npcAssetAliases: Record<string, string> = {');
  for (const record of records) {
    lines.push(`  ${JSON.stringify(record.nameEn)}: ${JSON.stringify(record.slug)},`);
    for (const alias of record.aliasesKo) {
      lines.push(`  ${JSON.stringify(alias)}: ${JSON.stringify(record.slug)},`);
    }
  }
  lines.push('};');
  lines.push('');
  lines.push('export function getNpcAsset(name: string | null | undefined): NpcAsset | null {');
  lines.push('  if (!name) return null;');
  lines.push('  const key = npcAssetAliases[name] ?? npcAssetAliases[name.trim()] ?? name.trim();');
  lines.push('  return npcAssets[key] ?? null;');
  lines.push('}');
  lines.push('');
  await fs.writeFile(tsPath, lines.join('\n'), 'utf8');

  console.log(`Downloaded ${records.length} NPC icon/image pairs.`);
  console.log(path.relative(rootDir, npcAssetDir).replace(/\\/g, '/'));
  console.log(path.relative(rootDir, tsPath).replace(/\\/g, '/'));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
