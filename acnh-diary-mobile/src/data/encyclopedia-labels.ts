const MONTH_LABELS: Record<string, string> = {
  Jan: '1월',
  Feb: '2월',
  Mar: '3월',
  Apr: '4월',
  May: '5월',
  Jun: '6월',
  Jul: '7월',
  Aug: '8월',
  Sep: '9월',
  Oct: '10월',
  Nov: '11월',
  Dec: '12월',
};

const LOCATION_LABELS: Record<string, string> = {
  Flying: '하늘을 날아다님',
  'Flying near blue, purple, and black flowers': '파란색·보라색·검은색 꽃 주변을 날아다님',
  'Flying near flowers': '꽃 주변을 날아다님',
  'Flying near light sources': '빛 주변을 날아다님',
  'On trees (any kind)': '모든 나무 위',
  'On the ground': '땅 위',
  'On flowers': '꽃 위',
  'On white flowers': '흰색 꽃 위',
  'Shaking non-fruit hardwood trees or cedar trees': '과일이 열리지 않는 활엽수나 침엽수를 흔들 때',
  'On trees (hardwood and cedar)': '활엽수와 침엽수 위',
  'Flying near water': '물 주변을 날아다님',
  Underground: '땅속',
  'On rivers and ponds': '강과 연못',
  'On tree stumps': '나무 그루터기',
  'On palm trees': '야자수 위',
  'Pushing snowballs': '눈덩이를 굴릴 때',
  'Disguised under trees': '나무 아래에 숨어 있음',
  'Shaking trees (hardwood and cedar)': '활엽수와 침엽수를 흔들 때',
  'On/near spoiled turnips/candy/lollipops': '썩은 무·사탕·막대사탕 위 또는 주변',
  'Disguised on shoreline': '해안가에 숨어 있음',
  'On beach rocks': '해변 바위 위',
  'Flying near trash or rotten turnips': '쓰레기나 썩은 무 주변을 날아다님',
  'On villagers': '주민에게 붙어 있음',
  'On rocks and bushes': '바위와 관목 위',
  'From hitting rocks': '바위를 칠 때',
  'Shaking trees': '나무를 흔들 때',
  River: '강',
  Pond: '연못',
  'River (clifftop)': '절벽 위 강',
  'River (mouth)': '강 하구',
  Sea: '바다',
  Pier: '부두',
  'Sea (raining)': '바다(비 오는 날)',
};

const CONDITION_LABELS: Record<string, string> = {
  'Any except rain': '비가 오지 않을 때',
  'Any weather': '날씨 무관',
  'Rain only': '비가 올 때만',
};

const LOCATION_TAG_LABELS: Record<string, string> = {
  'River (mouth)': '하구',
  'River (clifftop)': '절벽 위',
};

const RARITY_LABELS: Record<string, string> = {
  Common: '흔함',
  'Very Common': '매우 흔함',
  'Very common': '매우 흔함',
  Uncommon: '흔하지 않음',
  Rare: '희귀',
  'Very rare': '매우 희귀',
};

const SHADOW_LABELS: Record<string, string> = {
  Tiny: '1',
  Small: '2',
  Medium: '3',
  Large: '4',
  'Very large': '5',
  Huge: '6',
  Long: '긴 형태',
  'Very large (finned)': '5 (지느러미)',
};

const MOVEMENT_LABELS: Record<string, string> = {
  Stationary: '정지',
  'Very slow': '매우 느림',
  Slow: '느림',
  Medium: '보통',
  Fast: '빠름',
  'Very fast': '매우 빠름',
};

const FOSSIL_GROUP_LABELS: Record<string, string> = {
  Deinonychus: '데이노니쿠스',
  Dimetrodon: '디메트로돈',
  Diplodocus: '디플로도쿠스',
  Mammoth: '매머드',
  Megacerops: '메가케롭스',
  Megaloceros: '메갈로케로스',
  Brachiosaurus: '브라키오사우루스',
  'Sabertooth Tiger': '스밀로돈',
  Stegosaurus: '스테고사우루스',
  Spinosaurus: '스피노사우루스',
  Archelon: '아르켈론',
  Ankylosaurus: '안킬로사우루스',
  Ophthalmosaurus: '오프탈모사우루스',
  Iguanodon: '이구아노돈',
  Quetzalcoatlus: '케찰코아틀루스',
  Triceratops: '트리케라톱스',
  'T. Rex': '티렉스',
  Parasaurolophus: '파라사우롤로푸스',
  Pachycephalosaurus: '파키케팔로사우루스',
  Pteranodon: '프테라노돈',
  Plesiosaurus: '후타바사우루스',
};

const ART_TYPE_LABELS: Record<string, string> = {
  Painting: '그림',
  Statue: '조각',
};

const ART_STYLE_LABELS: Record<string, string> = {
  'Oil on canvas': '캔버스 유화',
  Marble: '대리석',
  Granodiorite: '화강섬록암',
  Basalt: '현무암',
  'Oil on wood panel': '목판 유화',
  'Woodblock print': '목판화',
  Bronze: '청동',
  Earthenware: '토기',
  'Oil on wood': '목재 유화',
  'Dyed silk': '염색 비단',
  Limestone: '석회암',
  'Pen and ink on paper': '종이에 펜과 잉크',
  'Tempura on canvas': '캔버스 템페라',
  'Oil on poplar': '포플러 목판 유화',
  'Color on silk': '비단 채색화',
  'Fired pottery': '구운 도기',
  'Gold leaf and ink on paper': '종이에 금박과 잉크',
};

const ART_NAME_LABELS: Record<string, string> = {
  Ophelia: '오필리아',
  'Liberty Leading the People': '민중을 이끄는 자유의 여신',
  'Nike of Samothrace': '사모트라케의 니케',
  'Girl with a Pearl Earring': '진주 귀걸이를 한 소녀',
  'The Clothed Maja': '옷을 입은 마하',
  David: '다비드',
  'Rosetta Stone': '로제타석',
  'The Night Watch': '야경',
  'Olmec Colossal Head': '올멕 거대 두상',
  Discobolus: '원반 던지는 사람',
  'The Hunters in The Snow': '눈 속의 사냥꾼',
  'Thirty-Six Views of Mount Fuji The Great Wave off Kanagawa': '가나가와 해변의 높은 파도',
  'Capitoline Wolf': '카피톨리노의 늑대',
  'Terracotta Army': '병마용',
  'Isle of The Dead': '죽음의 섬',
  'The Starry Night': '별이 빛나는 밤',
  'The Fighting Temeraire': '전함 테메레르',
  'Ajisai Sōkeizu': '자양화도',
  'Bust of Nefertiti': '네페르티티의 흉상',
  'Ōtani Oniji the 3rd as Yakko Edobei': '오타니 오니지 3세(야코 에도베이 역)',
  'Lady with an Ermine': '담비를 안고 있는 여인',
  'Venus de Milo': '밀로의 비너스',
  'Vitruvian Man': '비트루비우스적 인간',
  'Houmuwu Ding': '후무우정',
  'Las Meninas': '시녀들',
  'The Birth of Venus': '비너스의 탄생',
  'The Blue Boy': '파란 옷을 입은 소년',
  'King Kamehameha I': '카메하메하 1세',
  'Mona Lisa': '모나리자',
  'The Thinker': '생각하는 사람',
  Summer: '여름',
  'Beauty Looking Back': '미인도',
  'The Fifer': '피리 부는 소년',
  Sunflowers: '해바라기',
  'The Milkmaid': '우유 따르는 여인',
  'Jōmon Period "Dogū" Figurine Shakōki-dogū': '조몬 시대 토우 샤코키도구',
  'The Gleaners': '이삭 줍는 사람들',
  'A Sunday Afternoon on the Island of La Grande Jatte': '그랑드 자트 섬의 일요일 오후',
  'Folding Screen of Fūjin and Raijin': '바람신과 뇌신도 병풍',
  'A Bar at The Folies-Bergère': '폴리 베르제르의 술집',
  'Apples and Oranges': '사과와 오렌지',
  'The Sower': '씨 뿌리는 사람',
};

const AUTHOR_LABELS: Record<string, string> = {
  'John Everett Millais': '존 에버렛 밀레이',
  'Eugène Delacroix': '외젠 들라크루아',
  'Artist Unknown': '작자 미상',
  'Johannes Vermeer': '요하네스 페르메이르',
  'Francisco de Goya': '프란시스코 데 고야',
  Michelangelo: '미켈란젤로',
  'Rembrandt van Rijn': '렘브란트 판 레인',
  'Pieter Brueghel the Elder': '피터르 브뤼헐',
  'Katsushika Hokusai': '가쓰시카 호쿠사이',
  'Arnold Böcklin': '아르놀트 뵈클린',
  'Vincent van Gogh': '빈센트 반 고흐',
  'Joseph Mallord William Turner': '조지프 말러드 윌리엄 터너',
  'Itō Jakuchū': '이토 자쿠추',
  Thutmose: '투트모세',
  'Tōshūsai Sharaku': '도슈사이 샤라쿠',
  'Leonardo da Vinci': '레오나르도 다 빈치',
  'Diego Velázquez': '디에고 벨라스케스',
  'Sandro Botticelli': '산드로 보티첼리',
  'Thomas Gainsborough': '토머스 게인즈버러',
  'Thomas Ridgeway Gould': '토머스 리지웨이 굴드',
  'Auguste Rodin': '오귀스트 로댕',
  'Giuseppe Arcimboldo': '주세페 아르침볼도',
  'Hishikawa Moronobu': '히시카와 모로노부',
  'Édouard Manet': '에두아르 마네',
  'Jean-François Millet': '장프랑수아 밀레',
  'Georges Seurat': '조르주 쇠라',
  'Tawaraya Sōtatsu': '다와라야 소타쓰',
  'Paul Cézanne': '폴 세잔',
};

function lookup(value: string | null | undefined, labels: Record<string, string>) {
  if (!value) return value;
  return labels[value] ?? value;
}

export function localizeLocation(value: string | null) {
  return lookup(value, LOCATION_LABELS);
}

export function localizeLocationTag(value: string | null) {
  return lookup(value, LOCATION_TAG_LABELS);
}

export function localizeCondition(value: string | null | undefined) {
  return lookup(value, CONDITION_LABELS);
}

export function localizeRarity(value: string | null) {
  return lookup(value, RARITY_LABELS);
}

export function localizeShadow(value: string | null) {
  return lookup(value, SHADOW_LABELS);
}

export function localizeMovementSpeed(value: string | null) {
  return lookup(value, MOVEMENT_LABELS);
}

export function localizeFossilGroup(value: string | null) {
  return lookup(value, FOSSIL_GROUP_LABELS);
}

export function localizeArtType(value: string | null) {
  return lookup(value, ART_TYPE_LABELS);
}

export function localizeArtStyle(value: string | null) {
  return lookup(value, ART_STYLE_LABELS);
}

export function localizeArtName(value: string | null) {
  return lookup(value, ART_NAME_LABELS);
}

export function localizeAuthor(value: string | null) {
  return lookup(value, AUTHOR_LABELS);
}

export function localizeArtAvailability(value: string | null) {
  return value === "Jolly Redd's Treasure Trawler" ? '여욱의 보물선' : value;
}

export function localizeArtYear(value: string | null) {
  if (!value) return value;
  return value
    .replace(/\bcirca\b/gi, '약')
    .replace(/\b(\d+)(st|nd|rd|th) century\b/gi, '$1세기')
    .replace(/\bBCE\b/g, '기원전')
    .replace(/\bCE\b/g, '서기');
}

export function localizeAvailabilityLabel(value: string | null) {
  if (!value) return value;
  if (value === 'All year') return '연중';
  return value.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (month) => MONTH_LABELS[month]);
}

export function localizeAvailabilityTime(value: string | null) {
  if (!value) return value;
  const normalized = value.replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (normalized === 'NA') return '출현하지 않음';
  if (normalized === 'All day') return '하루 종일';
  return normalized.replace(/\b(\d{1,2})\s*(AM|PM)\b/gi, (_, hour: string, period: string) =>
    `${period.toUpperCase() === 'AM' ? '오전' : '오후'} ${hour}시`,
  );
}
