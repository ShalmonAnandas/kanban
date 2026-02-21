// Pastel colors for column headers
export const PASTEL_COLORS = [
  '#FFD6E0', // pastel pink
  '#FFE0B2', // pastel orange
  '#FFF9C4', // pastel yellow
  '#C8E6C9', // pastel green
  '#B2EBF2', // pastel cyan
  '#BBDEFB', // pastel blue
  '#D1C4E9', // pastel purple
  '#F8BBD0', // pastel rose
  '#DCEDC8', // pastel lime
  '#B3E5FC', // pastel light blue
  '#E1BEE7', // pastel lavender
  '#FFE0CC', // pastel peach
]

export function getRandomPastelColor(): string {
  return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)]
}
