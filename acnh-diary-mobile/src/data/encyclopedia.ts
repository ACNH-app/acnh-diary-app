import type { EncyclopediaCategory, EncyclopediaItem } from '../types/encyclopedia';

const categoryData: Record<EncyclopediaCategory, EncyclopediaItem[]> = {
  bugs: require('./content/encyclopedia/bugs.json') as EncyclopediaItem[],
  fish: require('./content/encyclopedia/fish.json') as EncyclopediaItem[],
  sea: require('./content/encyclopedia/sea.json') as EncyclopediaItem[],
  fossils: require('./content/encyclopedia/fossils.json') as EncyclopediaItem[],
  art: require('./content/encyclopedia/art.json') as EncyclopediaItem[],
};

export const encyclopediaCategories: Array<{
  category: EncyclopediaCategory;
  label: string;
  description: string;
}> = [
  { category: 'bugs', label: '곤충', description: '섬 곳곳에서 만나는 곤충' },
  { category: 'fish', label: '물고기', description: '강과 바다의 물고기' },
  { category: 'sea', label: '해산물', description: '바다에서 건져 올리는 생물' },
  { category: 'fossils', label: '화석', description: '땅속에서 발견하는 화석' },
  { category: 'art', label: '미술품', description: '박물관에 기증하는 작품' },
];

export const encyclopediaItems = Object.values(categoryData).flat();

export function getEncyclopediaItems(category: EncyclopediaCategory) {
  return categoryData[category];
}

export function getEncyclopediaItem(category: EncyclopediaCategory, itemId: string) {
  return categoryData[category].find((item) => item.id === itemId) ?? null;
}

export function getEncyclopediaLabel(category: EncyclopediaCategory) {
  return encyclopediaCategories.find((item) => item.category === category)?.label ?? category;
}

export function getPreviousMonth(month: number) {
  return month === 1 ? 12 : month - 1;
}
