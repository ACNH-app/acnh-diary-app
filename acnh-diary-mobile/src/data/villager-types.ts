export type VillagerImageType =
  | 'icon'
  | 'full'
  | 'poster'
  | 'framed_photo'
  | 'house_exterior'
  | 'house_interior';

export type VillagerImageAsset = {
  url: string | null;
  local_path: string | null;
  has_local_image: boolean;
};

export type VillagerCollectible = {
  item_id: string;
  name_ko: string;
  name_en: string;
  image_url: string;
  buy: number;
  sell: number;
  source: string | null;
  source_notes: string | null;
};

export type Villager = {
  id: string;
  key: string;
  name_ko: string;
  name_en: string;
  number: number | null;
  species: string;
  species_ko: string;
  personality: string;
  personality_ko: string;
  gender: string;
  subtype: string;
  hobby: string;
  activity_time: string | null;
  sign: string | null;
  birthday: string;
  birth_month: number;
  birth_day: number;
  catch_phrase_ko: string;
  saying_ko: string;
  debut: string | null;
  phrase: string | null;
  previous_phrases: string[];
  islander: boolean | null;
  appearances: string[];
  favorite_colors: string[];
  favorite_styles: string[];
  default_clothing: string | null;
  default_clothing_ko: string | null;
  default_clothing_variation: string | null;
  default_umbrella: string | null;
  default_umbrella_ko: string | null;
  house_wallpaper: string | null;
  house_wallpaper_ko: string | null;
  house_flooring: string | null;
  house_flooring_ko: string | null;
  house_furniture: string[];
  house_music: string | null;
  house_music_ko: string | null;
  house_music_note: string | null;
  house_music_id: string | null;
  house_music_image_url: string | null;
  house_music_local_image_path: string | null;
  collectibles: {
    poster: VillagerCollectible;
    framed_photo: VillagerCollectible;
  };
  icon_url: string;
  image_url: string;
  poster_url: string;
  framed_photo_url: string;
  house_exterior_url: string | null;
  house_interior_url: string | null;
  images: Record<VillagerImageType, VillagerImageAsset>;
  search_tokens: string[];
};
