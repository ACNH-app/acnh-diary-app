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
  src/screens/    온보딩·스플래시·오늘·준비 중 화면
  src/components/ 공용 UI 컴포넌트
  src/db/         SQLite 연결과 migration
  src/domain/     예정: 순수 TypeScript 도메인 규칙
  src/data/       앱에 번들되는 기준 데이터와 이미지 자산
  src/storage/    예정: Repository와 SQLite 변환 계층
  src/features/   예정: 기능별 hook·ViewModel
  src/backup/     예정: JSON 백업·복원
  src/ui/tokens/  예정: 디자인 토큰
```

라우팅 진입점은 `expo-router/entry`이며 `src/app/`이 유일한 route root다. 루트 `App.tsx`와 사용자 정의 `index.ts`를 앱 라우팅 진입점으로 사용하지 않는다.

## 설치

```bash
cd acnh-diary-mobile
npm ci --legacy-peer-deps
npx expo config --json
npx tsc --noEmit
```

의존성을 추가하거나 버전을 변경할 때는 Expo SDK 57과 호환되는지 확인하고 `npx expo install`을 사용한다.

## 실행

```bash
npx expo start --offline
```

현재 개발·검증 대상은 iOS다. React Native 0.86.3 네이티브 빌드에는 Xcode 16.1 이상이 필요하며, 현재 저장소는 Xcode 26.3에서도 빌드를 확인했다. 기본 `xcode-select` 경로의 Xcode를 사용한다.

```bash
npx expo run:ios
```

Xcode 26 계열을 사용하는 경우 `patches/expo-modules-jsi+57.0.6.patch`가 `npm install` 후 자동 적용된다. 실제 기기 또는 시뮬레이터가 필요하며, 시뮬레이터 없이 컴파일만 확인하려면 다음 명령을 사용한다.

```bash
npx expo run:ios --no-install --no-bundler --device generic
```

여러 Xcode가 설치되어 있어 특정 버전을 선택해야 할 때만 `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`처럼 기본 경로를 변경한다.

Android는 현재 수용 기준에서 제외하고 후속 단계에서 별도로 활성화한다.

웹은 최초 출시 플랫폼이 아니므로 `npm run web`을 모바일 빌드의 성공 기준으로 사용하지 않는다.

## 개발 순서

1. 스플래시 → 온보딩 → 오늘 화면의 Router 흐름을 완성한다.
2. SQLite migration과 섬·주민대표 저장을 연결한다.
3. `../dataset/app-ready/`에서 417명 주민·박물관 기준 데이터를 앱 번들로 연결한다.
4. 주민·도감·상세 화면과 상태 저장을 구현한다.
5. 백업·복원, 접근성, 실제 기기 테스트를 추가한다.
