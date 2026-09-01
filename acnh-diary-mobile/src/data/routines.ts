export type DefaultRoutineOption = {
  title: string;
  goalCount: number;
  goalLabel?: string;
};

export const DEFAULT_ROUTINE_OPTIONS: DefaultRoutineOption[] = [
  { title: '레시피 보틀', goalCount: 1, goalLabel: '1회' },
  { title: '돈나무', goalCount: 1, goalLabel: '1회' },
  { title: '바위치기', goalCount: 6, goalLabel: '6개' },
  { title: '화석 캐기', goalCount: 4, goalLabel: '4개' },
  { title: '나무 흔들기', goalCount: 1, goalLabel: '가구 2개·동전' },
  { title: '나무 흔들기 · 가구', goalCount: 2, goalLabel: '2개' },
  { title: '나무 흔들기 · 벌', goalCount: 5, goalLabel: '5마리' },
  { title: '나무 흔들기 · 동전', goalCount: 15, goalLabel: '15개' },
  { title: '옷가게 방문', goalCount: 1, goalLabel: '1회' },
  { title: '너굴포트 출석', goalCount: 1, goalLabel: '1회' },
  { title: '주민 레시피', goalCount: 3, goalLabel: '3회' },
  { title: '잠수해서 진주 캐기', goalCount: 1, goalLabel: '1회' },
  { title: '해탈한 교환', goalCount: 1, goalLabel: '가리비 1개' },
  { title: '갑돌보', goalCount: 1, goalLabel: '1회' },
  { title: '마추릴라 · 우정 확인', goalCount: 1, goalLabel: '1회' },
  { title: '마추릴라 · 오늘의 운세', goalCount: 1, goalLabel: '1회' },
  { title: '과일 수확', goalCount: 1, goalLabel: '사용자 설정' },
  { title: '채소 수확', goalCount: 1, goalLabel: '사용자 설정' },
  { title: '선물주기', goalCount: 10, goalLabel: '1~10명' },
];
