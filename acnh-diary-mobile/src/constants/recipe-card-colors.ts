type RecipeCardPalette = {
  background: string;
  pattern: string;
  border: string;
  accent: string;
};

// App display shades for the source color names, not sampled game RGB values.
const palettes: Record<string, RecipeCardPalette> = {
  silver: { background: '#E3E9ED', pattern: '#BBC9D3', border: '#ACBBC7', accent: '#4D6373' },
  yellow: { background: '#F3E8AF', pattern: '#DCC967', border: '#D1BD70', accent: '#78622C' },
  brown: { background: '#E5CEB5', pattern: '#C2A17B', border: '#BE9C77', accent: '#715032' },
  white: { background: '#F4F3EB', pattern: '#DCDACE', border: '#CECCBE', accent: '#656252' },
  gold: { background: '#EAD58A', pattern: '#CEAE49', border: '#BB963B', accent: '#735817' },
  cream: { background: '#F4EDCF', pattern: '#DED1A1', border: '#D2C498', accent: '#796638' },
  red: { background: '#EFC4BF', pattern: '#D99890', border: '#CE9188', accent: '#883F36' },
  'dark gray': { background: '#C9CBCD', pattern: '#A1A6AB', border: '#989DA3', accent: '#4D545C' },
  brick: { background: '#E7C3AC', pattern: '#CD9A7B', border: '#C48B6C', accent: '#854E32' },
  beige: { background: '#EFE8BE', pattern: '#D9CF85', border: '#D8CAA1', accent: '#756039' },
  green: { background: '#DAE7B9', pattern: '#B4CD83', border: '#A9BE80', accent: '#4E682E' },
  'light gray': { background: '#E5E3DC', pattern: '#C9C7BD', border: '#BCBAAE', accent: '#656252' },
  orange: { background: '#F3D2A7', pattern: '#DDA967', border: '#D29B5C', accent: '#865923' },
  pink: { background: '#F3D8E2', pattern: '#DFB1C4', border: '#D1A2B6', accent: '#87516A' },
  blue: { background: '#D3E8EF', pattern: '#A3CDDC', border: '#95BDCC', accent: '#3F6B80' },
  purple: { background: '#E3D8EC', pattern: '#C7B0D9', border: '#B69DC9', accent: '#735587' },
};

export function getRecipeCardPalette(cardColor: string | null | undefined): RecipeCardPalette {
  // Preserve unresolved color_N codes in data; do not invent their game colors.
  return (cardColor ? palettes[cardColor] : undefined) ?? palettes.beige;
}
