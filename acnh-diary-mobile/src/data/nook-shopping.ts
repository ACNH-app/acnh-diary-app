import eventData from './content/catalog/nook-shopping-events.json';
import yearData from './content/catalog/nook-shopping-years.json';
import type { CatalogItem } from '@/types/catalog';
import type { Hemisphere } from '@/types/island';

type Window = readonly [number, number];
type EventDefinition = {
  id: string;
  nameKo: string;
  start?: number;
  end?: number;
  rule?: string;
  rotating?: boolean;
  items: string[];
};
export type NookShoppingEvent = {
  id: string;
  nameKo: string;
  period: string;
  rotating: boolean;
  items: CatalogItem[];
};

const yearlyWindows: Record<string, Record<string, number[]>> = yearData.years;
const zodiacAnimals = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'sheep', 'monkey', 'rooster', 'dog', 'boar'];

function nthWeekday(year: number, month: number, weekday: number, nth: number) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + (weekday - firstWeekday + 7) % 7 + (nth - 1) * 7;
}

function getWindow(event: EventDefinition, year: number, hemisphere: Hemisphere): Window | undefined {
  switch (event.rule) {
    case 'summer': return hemisphere === 'north' ? [615, 621] : [1215, 1222];
    case 'winter': return hemisphere === 'north' ? [1215, 1222] : [615, 621];
    case 'cheese': return [500 + nthWeekday(year, 5, 6, 3), 500 + nthWeekday(year, 5, 1, 4)];
    case 'marine': {
      const day = nthWeekday(year, 7, 1, 3);
      return [700 + day - 9, 700 + day];
    }
    case 'zodiac-new-year': return [1222, 105];
    default: {
      const window = event.rule ? yearlyWindows[year]?.[event.rule] : [event.start, event.end];
      return window?.length === 2 && window[0] !== undefined && window[1] !== undefined ? [window[0], window[1]] : undefined;
    }
  }
}

function formatDay(code: number) {
  return `${String(Math.floor(code / 100)).padStart(2, '0')}.${String(code % 100).padStart(2, '0')}`;
}

export function getNookShoppingEvents(date: Date, hemisphere: Hemisphere, catalog: readonly CatalogItem[]): NookShoppingEvent[] {
  if (Number.isNaN(date.getTime())) return [];
  const year = date.getUTCFullYear();
  const day = (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
  const itemsByName = new Map(catalog.filter(item => item.source?.includes('너굴 쇼핑')).map(item => [item.nameEn, item]));
  return (eventData.events as EventDefinition[]).flatMap(event => {
    const window = getWindow(event, year, hemisphere);
    if (!window) return [];
    const [start, end] = window;
    const active = start <= end ? day >= start && day <= end : day >= start || day <= end;
    if (!active) return [];
    let names = event.items;
    if (event.rule === 'zodiac-new-year') {
      // December offers the following year's figurine; January still offers the current year's.
      const newYear = day >= start ? year + 1 : year;
      const animal = zodiacAnimals[((newYear - 2020) % 12 + 12) % 12];
      names = [`zodiac ${animal} figurine`];
      if (animal === 'boar') names.push('zodiac pig figurine');
      if (newYear === 2021 || newYear === 2022) names.push(`${newYear} celebratory arch`);
    }
    const items = names.flatMap(name => {
      const item = itemsByName.get(name);
      return item ? [item] : [];
    });
    return items.length ? [{ id: event.id, nameKo: event.nameKo, period: `${formatDay(start)} ~ ${formatDay(end)}`, rotating: Boolean(event.rotating), items }] : [];
  });
}
