import { COLORS } from '@/config/ui'

const CHESS_HIGHLIGHTS = {
  checkedKing: {
    strokeColor: COLORS.chessEffects.highlight.checkedKing.stroke,
    fillColor: COLORS.chessEffects.highlight.checkedKing.fill,
    fillAlpha: 0.22,
  },
  hoverMove: {
    strokeColor: COLORS.chessEffects.highlight.hoverMove.stroke,
    fillColor: COLORS.chessEffects.highlight.hoverMove.fill,
    fillAlpha: 0.25,
  },
  selectedMove: {
    strokeColor: COLORS.chessEffects.highlight.selectedMove.stroke,
    fillColor: COLORS.chessEffects.highlight.selectedMove.fill,
    fillAlpha: 0.25,
  },
  selectedPiece: {
    strokeColor: COLORS.chessEffects.highlight.selectedPiece.stroke,
    fillColor: COLORS.chessEffects.highlight.selectedPiece.fill,
    fillAlpha: 0.30,
  },
  validMoveCircle: {
    fillColor: COLORS.chessEffects.highlight.validMoveCircle.fill,
    fillAlpha: 0.30,
    radiusMultiplier: 0.17,
    captureRadiusMultiplier: 0.45,
    captureStrokeColor: COLORS.chessEffects.highlight.validMoveCircle.fill,
    captureStrokeWidth: 4,
    captureStrokeAlpha: 0.30,
  },
}

const CHESS_CAPTURE_EFFECTS = {
  particles: {
    color: {
      dark: COLORS.chessEffects.particles.capture.dark,
      light: COLORS.chessEffects.particles.capture.light,
    },
    count: 28,
    spawnSpreadMultiplier: 0.45,
    radius: {
      min: 2.8,
      max: 5.2,
    },
    driftDistance: {
      min: 22,
      max: 54,
    },
    alpha: 0.95,
    durationMs: {
      min: 320,
      max: 520,
    },
  },
  shake: {
    baseDurationMs: 95,
    durationPerPointMs: 14,
    maxDurationMs: 260,
    baseIntensity: 0.0026,
    intensityPerPoint: 0.00034,
    maxIntensity: 0.0072,
    rotation: {
      baseDegrees: 0.5,
      degreesPerPoint: 0.04,
      maxDegrees: 0.9,
      tweenDurationMs: 90,
    },
  },
}

const CHESS_MOVE_EFFECTS = {
  tweenDurationMs: 120,
  trail: {
    color: {
      dark: COLORS.chessEffects.particles.moveTrail.dark,
      light: COLORS.chessEffects.particles.moveTrail.light,
    },
    tickMs: 16,
    particlesPerTick: {
      min: 2,
      max: 7,
    },
    intensityPerExtraSquare: 0.45,
    sizeMultiplierPerExtraSquare: 0.12,
    durationMultiplierPerExtraSquare: 0.12,
    spawnJitter: {
      min: -3.4,
      max: 3.4,
    },
    angleJitter: {
      min: -0.8,
      max: 0.8,
    },
    driftDistance: {
      min: 7,
      max: 18,
    },
    radius: {
      min: 1.2,
      max: 2.8,
    },
    alpha: 0.65,
    durationMs: {
      min: 120,
      max: 220,
    },
    depth: 45,
  },
  endBurst: {
    count: 10,
    radius: {
      min: 1.4,
      max: 2.8,
    },
    driftDistance: {
      min: 6,
      max: 16,
    },
    alpha: 0.55,
    durationMs: {
      min: 120,
      max: 190,
    },
    depth: 45,
  },
}

export {
  CHESS_CAPTURE_EFFECTS,
  CHESS_HIGHLIGHTS,
  CHESS_MOVE_EFFECTS,
}
