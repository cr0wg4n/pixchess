function transformColorHex2Number(hex: string) {
  return Number.parseInt(hex.replace('#', ''), 16)
}

const COLORS = {
  primary: {
    text: '#ffffff',
    background: '#E23071',
    textStroke: '#000000',
  },
  chessboard: {
    light: transformColorHex2Number('#FFEAE1'),
    dark: transformColorHex2Number('#FFAB98'),
  },
}

const FONT_SIZES = {
  'xs': 20,
  'sm': 40,
  'md': 60,
  'lg': 80,
  'xl': 100,
  '2xl': 120,
  '3xl': 140,
  '4xl': 160,
}

export {
  COLORS,
  FONT_SIZES,
  transformColorHex2Number,
}
