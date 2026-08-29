# ACNH Diary App Data Spec

## 1. 목적

이 문서는 `dataset/app-ready/`를 기준으로 모동숲 다이어리 앱이 사용하는 데이터 구조를 정의한다.

- 목표는 "원본 수집 데이터"와 "앱이 직접 읽는 데이터"를 분리하는 것이다.
- 앱은 가능하면 `content/` 아래 파일만 읽고, `seed/`는 재가공용 보조 데이터로만 사용한다.
- 복합 필터를 지원하기 위해 각 도메인 데이터는 점진적으로 정규화한다.

## 2. 데이터 루트

앱 기준 데이터 루트는 `dataset/app-ready/`이다.

### 2.1 디렉토리 역할

- `content/`: 앱이 직접 읽는 JSON 데이터
- `assets/`: 로컬 이미지 자산
- `manifests/`: 오프라인 이미지 수집/동기화용 목록
- `seed/`: 원본 export, DB seed, 재생성용 보조 데이터

### 2.2 우선순위

1. `content/`의 정규화 JSON
2. `content/`의 원본형 JSON + 앱 어댑터
3. `seed/`의 export JSON

`seed/`는 앱 런타임에서 직접 조회하지 않는 것을 원칙으로 한다.

## 3. 공통 규칙

### 3.1 포맷 규칙

- 인코딩은 UTF-8
- 기본 포맷은 JSON
- 정규화 데이터는 배열(`[]`) 중심으로 관리한다
- 보조 맵 데이터는 객체(`{}`) 형태를 허용한다

### 3.2 필드 네이밍

- 식별자: `id`, `item_id`, `variation_id`
- 한국어 표시명: `name_ko`
- 영어 기준명: `name_en`
- 화면 표시용 라벨과 필터 key는 분리 가능
- 안정적인 필터 key는 가능하면 영어 또는 slug 형태를 사용

### 3.3 필터 규칙

- 그룹 간 조합은 `AND`
- 같은 그룹 내 다중 선택은 `OR`
- 텍스트 검색은 `search_tokens` 또는 별도 검색 인덱스를 사용
- 가격, 월, 시간대, 버전 등은 숫자/정규화 문자열로 보관한다

예시:

- `category in ['Tops', 'Dress-Up']`
- `styles includes 'Cute'`
- `colors includes 'Pink'`
- `seasonality_key = 'winter'`

## 4. 도메인별 준비 상태

| 도메인 | 기준 파일 | 현재 상태 | 앱 사용 방식 |
| --- | --- | --- | --- |
| 주민 | `content/villagers/villagers.normalized.json` | 정규화 완료 | 직접 사용 가능 |
| 박물관 | `content/museum/*.acnhapi.json` | 원본형 | 앱 어댑터 필요 |
| 의류 | `content/catalog/clothing/clothing.normalized.json` | 정규화 완료 | 직접 사용 가능 |
| 가구 | `content/catalog/furniture/*.acnhapi.json` | 원본형 | 앱 어댑터 또는 추가 정규화 권장 |
| 인테리어 | `content/catalog/interior/*.norviah.json` | 원본형 | 앱 어댑터 또는 추가 정규화 권장 |
| 특수 아이템 | `content/catalog/special-items/*.norviah.json` | 원본형 | 앱 어댑터 또는 추가 정규화 권장 |
| 음악 | `content/catalog/music/*.json` | 반원본형 | 직접 사용 가능, 필요 시 간단 정규화 |
| 레시피 | `content/catalog/recipes/recipes.norviah.json` | 반원본형 | 직접 사용 가능 |
| 리액션 | `content/catalog/reactions/reactions.norviah.json` | 반원본형 | 직접 사용 가능 |
| 로컬라이제이션 | `content/localization/*.json` | 보조 데이터 | 직접 사용 가능 |

## 5. 앱 기준 핵심 명세

## 5.1 Clothing Item

파일: `content/catalog/clothing/clothing.normalized.json`

타입: 배열

```json
{
  "id": "9ac8bdc6ec7b8595",
  "name_ko": "3D안경",
  "name_en": "3D glasses",
  "category": "Accessories",
  "category_ko": "액세서리",
  "source": "에이블 시스터즈",
  "source_note": "",
  "availability": [
    {
      "from": "Able Sisters",
      "note": ""
    }
  ],
  "prices": {
    "buy_bells": 490,
    "buy_poki": 440,
    "buy_other": [],
    "sell": 122
  },
  "image_url": "https://dodo.ac/np/images/1/15/3D_Glasses_%28White%29_NH_Icon.png",
  "styles": ["Active"],
  "styles_ko": ["활동적"],
  "label_themes": ["Party"],
  "label_themes_ko": ["파티"],
  "seasonality": "All year",
  "seasonality_key": "all_year",
  "variation_total": 2,
  "variation_ids": ["0", "1"],
  "variation_labels": ["White", "Black"],
  "colors": ["White", "Colorful", "Black"],
  "is_not_for_sale": false,
  "has_bell_price": true,
  "has_poki_price": true,
  "villager_equippable": true,
  "version_added": "1.0.0",
  "notes": "",
  "search_tokens": ["3D안경", "3D glasses", "Accessories", "액세서리"]
}
```

필수 필드:

- `id`
- `name_ko`
- `name_en`
- `category`
- `prices`
- `variation_total`

필터 권장 필드:

- `category`
- `styles`
- `label_themes`
- `colors`
- `seasonality_key`
- `source`
- `availability[].from`
- `has_bell_price`
- `has_poki_price`
- `is_not_for_sale`

## 5.2 Clothing Variation

파일: `content/catalog/clothing/clothing.variations.json`

타입: 배열

```json
{
  "item_id": "00109493a1081282",
  "variation_id": "0",
  "label": "Berry red",
  "image_url": "https://dodo.ac/np/images/8/82/Tweed_Pants_%28Berry_Red%29_NH_Icon.png",
  "price": 0,
  "pattern": "",
  "source": "",
  "source_note": "",
  "color1": "",
  "color2": ""
}
```

용도:

- 상세 화면 썸네일
- 변형별 이미지 선택
- 색상 단위 필터 확장

## 5.3 Clothing Filter Options

파일: `content/catalog/clothing/clothing.filter-options.json`

타입: 객체

```json
{
  "categories": [{ "key": "Accessories", "count": 95 }],
  "styles": [{ "key": "Cute", "count": 420 }],
  "label_themes": [{ "key": "Party", "count": 386 }],
  "colors": [{ "key": "Pink", "count": 541 }],
  "seasons": [{ "key": "winter", "count": 95 }],
  "sources": [{ "key": "에이블 시스터즈", "count": 1016 }],
  "availability_from": [{ "key": "Able Sisters", "count": 1016 }]
}
```

용도:

- 필터 패널 옵션 렌더링
- 옵션 개수 표시
- 비어 있는 옵션 숨김 처리

## 5.4 Clothing Summary

파일: `content/catalog/clothing/clothing.summary.json`

타입: 객체

역할:

- 빌드 검증
- 데이터 버전 체크
- 관리용 대시보드 수치 표시

## 5.5 Villagers

파일:

- `content/villagers/villagers.normalized.json`
- `content/villagers/villagers.filter-options.json`
- `content/villagers/villagers.summary.json`
- 원본 보관: `content/villagers/villagers.acnhapi.json`

현재 앱 기준 구조:

- 배열 기반 정규화 완료
- 원본 ACNHAPI 구조는 보관용
- 로컬 이미지 경로까지 연결 가능

기준 스키마:

```json
{
  "id": 1,
  "key": "ant00",
  "file_name": "ant00",
  "name_ko": "사지마",
  "name_en": "Cyrano",
  "species": "Anteater",
  "species_ko": "개미핥기",
  "personality": "Cranky",
  "personality_ko": "무뚝뚝",
  "gender": "Male",
  "subtype": "B",
  "hobby": "Education",
  "birthday": "9/3",
  "birthday_string": "March 9th",
  "birth_month": 3,
  "birth_day": 9,
  "birth_month_key": "03",
  "catch_phrase_en": "ah-CHOO",
  "catch_phrase_ko": "임돠",
  "saying_en": "Don't punch your nose to spite your face.",
  "saying_ko": "개미를 핥지 않고 먹는 개미핥기",
  "icon_url": "https://acnhapi.com/v1/icons/villagers/1",
  "image_url": "https://acnhapi.com/v1/images/villagers/1",
  "local_image_path": "assets/villagers/ant00.png",
  "has_local_image": true,
  "bubble_color": "#194c89",
  "text_color": "#fffad4",
  "search_tokens": ["사지마", "Cyrano", "Anteater", "개미핥기"]
}
```

필수 필드:

- `id`
- `key`
- `name_ko`
- `name_en`
- `species`
- `personality`

필터 권장 필드:

- `species`
- `personality`
- `hobby`
- `gender`
- `birth_month_key`
- `has_local_image`

보조 파일:

- `villagers.filter-options.json`: 종족, 성격, 취미, 성별, 생일 월, subtype 집계
- `villagers.summary.json`: 데이터 개수와 로컬 이미지 보유 현황

## 5.6 Museum Creatures

파일:

- `content/museum/bugs.acnhapi.json`
- `content/museum/fish.acnhapi.json`
- `content/museum/sea.acnhapi.json`
- `content/museum/fossils.acnhapi.json`

앱 사용 규칙:

- 현재는 원본 배열을 그대로 읽어도 됨
- 필터를 많이 쓸 예정이면 별도 정규화 권장

추천 공통 필드:

- `id`
- `name_ko`
- `name_en`
- `category`
- `price`
- `location`
- `rarity`
- `month_northern`
- `month_southern`
- `time_array`
- `image_url`

## 5.7 Furniture / Interior / Special Items

현재 파일군:

- `content/catalog/furniture/*.acnhapi.json`
- `content/catalog/interior/*.norviah.json`
- `content/catalog/special-items/*.norviah.json`

권장 사항:

- 화면 단위로 필요한 범주만 먼저 정규화
- 공통 필드 세트를 맞추는 것이 중요

권장 공통 필드:

- `id`
- `name_ko`
- `name_en`
- `category`
- `subcategory`
- `source`
- `prices`
- `colors`
- `styles`
- `size`
- `is_diy`
- `is_catalog`
- `version_added`
- `image_url`
- `search_tokens`

## 5.8 Music

기준 파일:

- `content/catalog/music/music.acnhapi.json`
- `content/catalog/music/music-extra.norviah.json`
- `content/catalog/music/music_name_map_ko.json`
- 자산: `assets/music/`

앱 사용 규칙:

- 기본 목록은 `music.acnhapi.json`
- 추가 메타는 `music-extra.norviah.json`
- 로컬 앨범아트가 필요하면 `assets/music/` 우선

## 5.9 Recipes

기준 파일:

- `content/catalog/recipes/recipes.norviah.json`
- `content/catalog/recipes/recipe_name_map_ko.json`

필터 후보:

- `category`
- `source[]`
- `seasonEvent`
- `seasonEventExclusive`
- `materials`
- `sell`

## 5.10 Reactions

기준 파일:

- `content/catalog/reactions/reactions.norviah.json`
- `content/catalog/reactions/reactions-translation.norviah.json`
- `content/catalog/reactions/reaction_name_map_ko.json`

필터 후보:

- `source[]`
- `versionAdded`
- `seasonEvent`

## 6. 로컬라이제이션 명세

### 6.1 번역 맵 파일

예:

- `name_map_ko.json`
- `species_map_ko.json`
- `personality_map_ko.json`
- `clothing_style_map_ko.json`

규칙:

- key는 영문 기준값
- value는 한국어 표시 문자열

### 6.2 표시 우선순위

1. 정규화 데이터의 `*_ko`
2. 번역 맵 lookup
3. 원본 영문 값

## 7. 이미지 자산 명세

### 7.1 로컬 자산 위치

- 주민 이미지: `assets/villagers/`
- 음악 이미지: `assets/music/`
- 오프라인 캐시: `assets/offline_cache/`

### 7.2 이미지 사용 우선순위

1. 로컬 자산 경로
2. 오프라인 캐시
3. 원본 원격 `image_url`

앱에서는 가능하면 원격 URL을 그대로 박지 말고, 로컬 자산 매핑 레이어를 두는 것을 권장한다.

## 8. 검색/필터 구현 기준

복합 필터를 고려하면 JSON만으로도 충분히 구현 가능하다. 핵심은 "질의 엔진"이 아니라 "정규화된 필드"다.

권장 구현 방식:

- 앱 시작 시 도메인별 JSON 로드
- 메모리 내 배열 인덱스 생성
- 문자열 검색은 `search_tokens` 기반
- 필터 옵션 수는 `*.filter-options.json` 우선 사용
- 상세 변형 조회는 `item_id`로 `clothing.variations.json` 조인

권장 필터 동작:

- 카테고리, 스타일, 색상, 테마: 다중 선택 허용
- 가격: 범위 필터
- 계절: 단일 또는 다중 선택
- 입수처: 다중 선택
- 정렬: 이름, 가격, 버전, 변형 수

## 9. 정규화 우선순위

현재 바로 앱에 쓰기 가장 좋은 순서는 아래와 같다.

1. 의류: 완료
2. 박물관 생물: 다음 정규화 대상
3. 가구/인테리어: 화면 범위 확정 후 정규화
4. 음악/레시피/리액션: 필요할 때 얕은 정규화

## 10. 생성 및 유지보수

- 의류 정규화 생성 스크립트: `scripts/build_clothing_app_dataset.py`
- 주민 정규화 생성 스크립트: `scripts/build_villager_app_dataset.py`
- 향후 다른 도메인도 동일하게 `build_*_app_dataset.py` 패턴으로 추가
- 새 정규화 파일을 만들면 `index.json`의 `primary_files`에 반영

## 11. 현재 기준 결론

- 앱의 1차 기준 데이터 루트는 `dataset/app-ready/`
- 의류와 주민은 이미 앱 직접 사용 가능
- 다른 도메인은 원본형 JSON이므로 화면별 어댑터 또는 추가 정규화가 필요
- 복합 필터는 SQL보다 먼저 정규화 JSON 설계가 우선이다
