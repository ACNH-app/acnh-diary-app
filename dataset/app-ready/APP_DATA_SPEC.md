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
| 주민 | `content/villagers/villagers.normalized.json` | 417명 정규화 완료 | 직접 사용 가능 |
| 도감 | `content/encyclopedia/{bugs,fish,sea,fossils,art}.json` | 316개 정규화 완료 | 직접 사용 가능 |
| 박물관 원본 | `content/museum/*.acnhapi.json` | 원본형 보관 | 도감 생성 보조 데이터 |
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

앱 번들 복사 경로:

- `acnh-diary-mobile/src/data/content/villagers/villagers.json`
- `acnh-diary-mobile/src/data/assets/villagers/{icon,full,poster,framed_photo,house_exterior,house_interior}/`
- `acnh-diary-mobile/src/data/assets/catalog/music/items/`

현재 앱 기준 구조:

- 배열 기반 정규화 완료
- 전체 주민 수는 417명으로 고정한다.
- 기준 입력은 `seed/supabase_seed/content_db/villagers.json` export이며, 앱 번들에서는 생성된 정규화 파일을 `villagers.json`으로 복사해 읽는다.
- `villager_id`를 문자열 `id`와 `key`로 사용한다. `number`는 번호순 정렬용 보조 필드이며 앱의 주민 식별자로 사용하지 않는다. ACNHAPI에 없는 26명은 `number: null`이다.
- ACNHAPI 파일은 391명에 대한 보조 enrichment source로만 사용한다. 주민 수·식별자·기본값의 기준은 417명 seed이며, ACNHAPI에 없는 26명은 seed 값을 사용한다.
- 주민 417명의 아이콘·전체·포스터·액자 사진·하우스 외관·하우스 내부 이미지를 `assets/villagers/{icon,full,poster,framed_photo,house_exterior,house_interior}/`에 보관한다. 기존 `local_image_path`는 전체 이미지 경로의 호환용 alias이며, 상세 타입별 경로는 `images` 객체에서 제공한다.
- 주민의 포스터·액자 사진은 `collectibles` 객체에서 가격·획득 방법·아이템 식별자를 함께 제공한다. 하우스 음악은 `house_music_id`와 `house_music_local_image_path`로 음악 이미지 자산과 연결한다.

기준 스키마:

```json
{
  "id": "ant00",
  "key": "ant00",
  "file_name": "ant00",
  "number": 1,
  "name_ko": "사지마",
  "name_en": "Cyrano",
  "name_locales": {
    "name-KRko": "사지마",
    "name-USen": "Cyrano"
  },
  "species": "Anteater",
  "species_ko": "개미핥기",
  "personality": "Cranky",
  "personality_ko": "무뚝뚝",
  "gender": "Male",
  "subtype": "B",
  "hobby": "Education",
  "sign": "Pisces",
  "birthday": "March 9",
  "birth_month": 3,
  "birth_day": 9,
  "birth_month_key": "03",
  "activity_time": null,
  "catch_phrase_en": "ah-CHOO",
  "catch_phrase_ko": "임돠",
  "catchphrase_locales": {
    "catch-KRko": "임돠",
    "catch-USen": "ah-CHOO"
  },
  "saying_en": "Don't punch your nose to spite your face.",
  "saying_ko": "개미를 핥지 않고 먹는 개미핥기",
  "debut": "DNM",
  "phrase": "ah-CHOO",
  "previous_phrases": [],
  "favorite_colors": ["Blue"],
  "favorite_styles": ["Simple"],
  "default_clothing": "Hanten coat",
  "default_clothing_ko": "한텐 코트",
  "default_clothing_variation": null,
  "default_umbrella": "paper parasol",
  "default_umbrella_ko": "종이 우산",
  "house_wallpaper": "Chain-Link Fence",
  "house_wallpaper_ko": "공터 벽",
  "house_flooring": "Dirt Flooring",
  "house_flooring_ko": "흙 바닥",
  "house_furniture": [],
  "house_music": "K.K. Song",
  "house_music_ko": null,
  "house_music_note": null,
  "house_music_id": "43",
  "house_music_image_url": "https://dodo.ac/np/images/music.png",
  "house_music_local_image_path": "assets/catalog/music/items/43.png",
  "icon_url": "https://dodo.ac/np/images/b/b4/Cyrano_NH_Villager_Icon.png",
  "image_url": "https://dodo.ac/np/images/4/48/Cyrano_NH.png",
  "photo_url": "https://dodo.ac/np/images/0/02/Cyrano%27s_Photo_NH_Texture.png",
  "poster_url": "https://dodo.ac/np/images/1/16/Cyrano%27s_Poster_NH_Icon.png",
  "framed_photo_url": "https://dodo.ac/np/images/4/4c/Cyrano%27s_Photo_%28Natural_Wood%29_NH_Icon.png",
  "house_exterior_url": "https://dodo.ac/np/images/2/25/House_of_Cyrano_NH_Model.png",
  "house_interior_url": "https://dodo.ac/np/images/f/f5/House_of_Cyrano_NH.jpg",
  "images": {
    "icon": {
      "url": "https://dodo.ac/np/images/b/b4/Cyrano_NH_Villager_Icon.png",
      "local_path": "assets/villagers/icon/ant00.png",
      "has_local_image": true
    },
    "full": {
      "url": "https://dodo.ac/np/images/4/48/Cyrano_NH.png",
      "local_path": "assets/villagers/full/ant00.png",
      "has_local_image": true
    },
    "poster": {
      "url": "https://dodo.ac/np/images/1/16/Cyrano%27s_Poster_NH_Icon.png",
      "local_path": "assets/villagers/poster/ant00.png",
      "has_local_image": true
    },
    "framed_photo": {
      "url": "https://dodo.ac/np/images/4/4c/Cyrano%27s_Photo_%28Natural_Wood%29_NH_Icon.png",
      "local_path": "assets/villagers/framed_photo/ant00.png",
      "has_local_image": true
    },
    "house_exterior": {
      "url": "https://dodo.ac/np/images/2/25/House_of_Cyrano_NH_Model.png",
      "local_path": "assets/villagers/house_exterior/ant00.png",
      "has_local_image": true
    },
    "house_interior": {
      "url": "https://dodo.ac/np/images/f/f5/House_of_Cyrano_NH.jpg",
      "local_path": "assets/villagers/house_interior/ant00.jpg",
      "has_local_image": true
    }
  },
  "collectibles": {
    "poster": {
      "item_id": "...",
      "name_ko": "사지마의 포스터",
      "name_en": "Cyrano's poster",
      "image_url": "https://dodo.ac/np/images/1/16/Cyrano%27s_Poster_NH_Icon.png",
      "buy": 0,
      "sell": 0,
      "source": "너굴 쇼핑",
      "source_notes": null
    },
    "framed_photo": {
      "item_id": "...",
      "name_ko": "사지마의 사진",
      "name_en": "Cyrano's photo",
      "image_url": "https://dodo.ac/np/images/4/4c/Cyrano%27s_Photo_%28Natural_Wood%29_NH_Icon.png",
      "buy": 0,
      "sell": 0,
      "source": "주민에게 받기",
      "source_notes": null
    }
  },
  "local_image_path": "assets/villagers/full/ant00.png",
  "has_local_image": true,
  "icon_local_image_path": "assets/villagers/icon/ant00.png",
  "full_image_local_path": "assets/villagers/full/ant00.png",
  "poster_local_image_path": "assets/villagers/poster/ant00.png",
  "framed_photo_local_image_path": "assets/villagers/framed_photo/ant00.png",
  "bubble_color": "#194c89",
  "text_color": "#fffad4",
  "title_color": "#194c89",
  "search_tokens": ["사지마", "Cyrano", "Anteater", "개미핥기"]
}
```

추가 데이터 규칙:

- `name_locales`와 `catchphrase_locales`는 원본 locale key를 보존한다. ACNHAPI에 없는 26명은 dataset에서 제공되는 한국어·영어 값만 기록한다.
- 기본 옷·우산·벽지·바닥·음악은 각 `*_ko` 값이 있으면 한국어 표시값으로 사용하고, 없으면 영문 기준값으로 대체한다.
- `debut`, `phrase`, `previous_phrases`, `title_color`는 seed 원본의 주민 상세 속성을 표준 필드로 노출한다.
- `icon_url`은 아이콘, `image_url`은 전체 이미지, `poster_url`은 포스터, `framed_photo_url`은 기본 액자 사진 이미지다. 기존 `photo_url`은 액자 없는 원본 사진 텍스처로 보존한다.
- `images`는 각 이미지 타입의 원격 URL과 로컬 경로를 함께 제공한다. `local_image_path`는 전체 이미지 경로의 하위 호환용 alias다.
- `activity_time`과 `house_furniture`는 원본에 값이 있을 때만 채운다. 현재 기준 데이터에는 값이 없어 앱에서 해당 행을 숨긴다.
- `previous_phrases`가 빈 배열인 것은 원본에 과거 말버릇이 없는 정상 상태다.
- 원본 `raw_json` 전체는 앱 번들에 포함하지 않고, 앱 상세·검색에 필요한 속성만 명시적 필드로 변환한다.

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
- `villagers.summary.json`: 데이터 개수, 상세 필드 채움 현황, 다국어 source 보유 현황, 로컬 이미지 보유 현황

## 5.6 Encyclopedia

파일:

- `content/encyclopedia/bugs.json` (80)
- `content/encyclopedia/fish.json` (80)
- `content/encyclopedia/sea.json` (40)
- `content/encyclopedia/fossils.json` (73)
- `content/encyclopedia/art.json` (43)

앱 사용 규칙:

- 기준 데이터의 `id`는 사용자 `collection_records.item_id`와 연결하는 고정 키다.
- 모든 항목은 `image.localPath`를 가지며, 앱은 `encyclopedia-assets.ts` 정적 맵을 통해 로컬 이미지를 사용한다.
- 생물 `tankImage.localPath`는 tank 전시 이미지를, 미술품 `artwork.realImageLocalPath`와 `artwork.fakeImageLocalPath`는 진품·가품 비교 이미지를 가리킨다.
- `availability.north`와 `availability.south`는 반구별 월·시간을 보관한다. 월별 추천은 앱의 게임 날짜와 활성 섬 반구로 계산한다.
- 물고기의 강 계열 위치는 `location: "River"`로 통일한다. 원래 `River (mouth)`였던 항목은 `locationTags: ["River (mouth)"]`, `River (clifftop)`였던 항목은 `locationTags: ["River (clifftop)"]`를 추가하며, 물고기에 별도 출현조건 데이터가 없으면 `condition` 필드를 생략한다.
- 미술품은 `artwork`에 작품 정보와 진품·가품 설명을 보관하며 `hasFake`에 따라 진품/가품 보유 상태를 독립적으로 기록한다.

## 5.7 Museum Source Archives

파일:

- `content/museum/bugs.acnhapi.json`
- `content/museum/fish.acnhapi.json`
- `content/museum/sea.acnhapi.json`
- `content/museum/fossils.acnhapi.json`

앱 사용 규칙:

- 도감 앱 데이터 생성 시 박물관 설명과 이름 보조 정보의 source archive로 사용한다.
- 화면은 `content/museum/`의 원본 키를 직접 읽지 않고 `content/encyclopedia/` 정규화 결과를 사용한다.

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
- 자산: `assets/catalog/music/items/`

앱 사용 규칙:

- 기본 목록은 `music.acnhapi.json`
- 추가 메타는 `music-extra.norviah.json`
- 로컬 앨범아트가 필요하면 `assets/catalog/music/items/` 우선

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

- 주민 아이콘: `assets/villagers/icon/`
- 주민 전체 이미지: `assets/villagers/full/`
- 주민 포스터: `assets/villagers/poster/`
- 주민 액자 사진: `assets/villagers/framed_photo/`
- 주민 하우스 외관: `assets/villagers/house_exterior/`
- 주민 하우스 내부: `assets/villagers/house_interior/`
- 기존 256px 주민 이미지 보관: `assets/villagers/legacy/` (앱 미사용)
- 도감 이미지: `assets/encyclopedia/{art,bugs,fish,fossils,sea}/`
- 도감 상세 이미지: `assets/encyclopedia/{bugs,fish,sea}/tank/`, `assets/encyclopedia/art/{real,fake}/`
- 카탈로그 이미지: `assets/catalog/{furniture,interior,clothing,music,items,tools,special_items,gyroids,photos,recipes,reactions}/`
- 음악 이미지: `assets/catalog/music/items/`
- 오프라인 캐시: `assets/offline_cache/`
- 오프라인 캐시 분류 매니페스트: `manifests/offline_asset_manifests/offline_cache.classified.json`
- 카탈로그 이미지 경로 매니페스트: `manifests/offline_asset_manifests/catalog_asset_paths.json`

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
2. 도감 5종: 완료
3. 가구/인테리어: 화면 범위 확정 후 정규화
4. 음악/레시피/리액션: 필요할 때 얕은 정규화

## 10. 생성 및 유지보수

- 의류 정규화 생성 스크립트: `scripts/build_clothing_app_dataset.py`
- 주민 417명 정규화 생성 스크립트: `scripts/build_villager_app_dataset.py`
- 주민 6종 이미지 다운로드 스크립트: `scripts/download_villager_assets.py`
- 주민 기준 생성 명령: `python3 scripts/build_villager_app_dataset.py`
- 주민 이미지 준비/점검 명령(캐시 우선, 기본값은 네트워크를 사용하지 않음): `python3 scripts/download_villager_assets.py`
- 주민 이미지 다운로드 명령(네트워크 사용 명시): `python3 scripts/download_villager_assets.py --allow-network`
- 오프라인 캐시 분류 명령: `python3 scripts/classify_offline_cache.py`
- 카탈로그 이미지 정리 명령: `python3 scripts/materialize_catalog_assets.py`
- 카탈로그 이미지 정적 맵 생성 명령: `python3 scripts/build_catalog_asset_map.py`
- 누락 도감·카탈로그 이미지 다운로드 명령: `python3 scripts/download_catalog_assets.py --workers 8`
- 향후 다른 도메인도 동일하게 `build_*_app_dataset.py` 패턴으로 추가
- 새 정규화 파일을 만들면 `index.json`의 `primary_files`에 반영

## 11. 현재 기준 결론

- 앱의 1차 기준 데이터 루트는 `dataset/app-ready/`
- 의류와 주민 417명은 앱 직접 사용 가능한 정규화 산출물이다.
- 주민 417명의 아이콘·전체·포스터·액자 사진을 모두 로컬에 확보했으며, 모든 레코드에 각 원격 URL도 예비 경로로 유지한다.
- 다른 도메인은 원본형 JSON이므로 화면별 어댑터 또는 추가 정규화가 필요
- 복합 필터는 SQL보다 먼저 정규화 JSON 설계가 우선이다
