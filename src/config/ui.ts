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
  chessEffects: {
    highlight: {
      checkedKing: {
        stroke: transformColorHex2Number('#FF6B6B'),
        fill: transformColorHex2Number('#FF4D4D'),
      },
      selectedPiece: {
        stroke: transformColorHex2Number('#FFD166'),
        fill: transformColorHex2Number('#ffd258'),
      },
      validMoveCircle: {
        fill: transformColorHex2Number('#b37236'),
      },
    },
    particles: {
      capture: {
        light: transformColorHex2Number('#FFFFFF'),
        dark: transformColorHex2Number('#2B2B2B'),
      },
      moveTrail: {
        light: transformColorHex2Number('#FFF8DF'),
        dark: transformColorHex2Number('#27303A'),
      },
    },
  },
  promotionPopup: {
    backdrop: transformColorHex2Number('#000000'),
    panel: {
      background: transformColorHex2Number('#FFFFFF'),
      stroke: transformColorHex2Number('#333333'),
    },
    title: {
      text: '#111111',
    },
  },
  playerProfile: {
    black: {
      background: transformColorHex2Number('#1C1C1C'),
      border: transformColorHex2Number('#474747'),
      text: '#F4F4F4',
    },
    white: {
      background: transformColorHex2Number('#FFFFFF'),
      border: transformColorHex2Number('#B9B9B9'),
      text: '#1B1B1B',
    },
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
