import type { EncyclopediaAvailability, EncyclopediaItem } from '@/types/encyclopedia';

export type Hemisphere = 'north' | 'south';

export type MonthlyAvailabilityFlags = {
  isLeavingThisMonth: boolean;
  isNewThisMonth: boolean;
};

export function normalizeAvailabilityTime(value?: string | null) {
  return value?.replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim() ?? '';
}

function toHour(hourValue: string, meridiem: string) {
  const hour = Number(hourValue) % 12;
  return meridiem.toUpperCase() === 'PM' ? hour + 12 : hour;
}

export function parseAvailabilitySegments(value?: string | null) {
  const normalized = normalizeAvailabilityTime(value);
  if (!normalized || normalized.toLowerCase() === 'na') return [];
  if (normalized.toLowerCase() === 'all day') return [{ start: 0, end: 24 }];

  const matches = [...normalized.matchAll(/(\d{1,2})\s*(AM|PM)\s*(?:-|–|—|~|to)\s*(\d{1,2})\s*(AM|PM)/gi)];

  return matches.flatMap((match) => {
    const start = toHour(match[1], match[2]);
    const end = toHour(match[3], match[4]);

    if (start === end) return [{ start: 0, end: 24 }];
    if (start < end) return [{ start, end }];
    return [
      { start, end: 24 },
      { start: 0, end },
    ];
  });
}

export function isAvailableAtMinute(
  availability: EncyclopediaAvailability,
  month: number,
  currentMinute: number,
) {
  if (!availability.months.includes(month)) return false;

  const time = normalizeAvailabilityTime(availability.timesByMonth[String(month)]);
  if (!time || time.toLowerCase() === 'na') return false;
  if (time.toLowerCase() === 'all day') return true;

  const segments = parseAvailabilitySegments(time);
  if (segments.length === 0) return true;

  return segments.some((segment) => {
    const start = segment.start * 60;
    const end = segment.end * 60;
    return currentMinute >= start && currentMinute < end;
  });
}

export function isAvailableInMonth(item: EncyclopediaItem, hemisphere: Hemisphere, month: number) {
  return item.availability[hemisphere].months.includes(month);
}

export function getMonthlyAvailabilityFlags(
  item: EncyclopediaItem,
  hemisphere: Hemisphere,
  month: number,
): MonthlyAvailabilityFlags {
  const previousMonth = month === 1 ? 12 : month - 1;
  const nextMonth = month === 12 ? 1 : month + 1;
  const availableThisMonth = isAvailableInMonth(item, hemisphere, month);

  return {
    isLeavingThisMonth: availableThisMonth && !isAvailableInMonth(item, hemisphere, nextMonth),
    isNewThisMonth: availableThisMonth && !isAvailableInMonth(item, hemisphere, previousMonth),
  };
}
