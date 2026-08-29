# 모동숲 다이어리 모바일 앱

React Native + Expo SDK 57 + Expo Router + TypeScript로 만드는 오프라인 우선 모바일 앱이다. 사용자 기록은 `expo-sqlite`에 저장하고, 기준 데이터는 저장소의 `../dataset/app-ready/`에서 앱 번들용 데이터로 변환한다.

상세 요구사항과 설계는 다음 문서를 기준으로 한다.

- `../docs/ACNH-Diary-Mobile-SRS.md`: 기능·품질 요구사항
- `../docs/ACNH-Diary-Mobile-SAD.md`: 아키텍처 결정
- `../docs/ACNH-Diary-Mobile-SDS.md`: 디렉터리·타입·SQLite·Repository 상세 설계

## 구조

```text
acnh-diary-mobile/
  src/app/        Expo Router route와 layout
  src/domain/     순수 TypeScript 도메인 규칙
  src/data/       앱에 번들되는 기준 데이터 adapter와 manifest
  src/storage/    Repository와 SQLite 변환 계층
  src/features/   기능별 hook·ViewModel
  src/components/ 공용 UI 컴포넌트
  src/db/         SQLite 연결과 migration
  src/backup/     JSON 백업·복원
  src/ui/tokens/  디자인 토큰
```

라우팅 진입점은 `expo-router/entry`이며 `src/app/`이 유일한 route root다. 루트 `App.tsx`와 사용자 정의 `index.ts`를 앱 라우팅 진입점으로 사용하지 않는다.

## 설치

```bash
cd acnh-diary-mobile
npm ci
npx expo config --json
npx tsc --noEmit
```

의존성을 추가하거나 버전을 변경할 때는 Expo SDK 57과 호환되는지 확인하고 `npx expo install`을 사용한다.

## 실행

```bash
npx expo start --offline
```

네이티브 개발 빌드는 다음 명령으로 확인한다.

```bash
npx expo run:ios
npx expo run:android
```

Android 네이티브 프로젝트가 없는 경우 먼저 프로젝트 설정에 맞춰 생성한다. iOS·Android 실행은 해당 시뮬레이터 또는 실제 기기와 네이티브 개발 환경이 필요하다.

웹은 최초 출시 플랫폼이 아니므로 `npm run web`을 모바일 빌드의 성공 기준으로 사용하지 않는다.

## 개발 순서

1. 스플래시 → 온보딩 → 오늘 화면의 Router 흐름을 완성한다.
2. SQLite migration과 섬·주민대표 저장을 연결한다.
3. `../dataset/app-ready/`에서 주민·박물관 기준 데이터를 앱 번들로 연결한다.
4. 주민·도감·상세 화면과 상태 저장을 구현한다.
5. 백업·복원, 접근성, 실제 기기 테스트를 추가한다.
