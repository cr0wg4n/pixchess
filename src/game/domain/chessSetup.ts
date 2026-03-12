import type { PieceState } from '@/game/types'
import {
  PieceColor,
  PieceTextureKey,
  PieceType,
} from '@/game/types'

const BACK_RANK_ORDER: PieceType[] = [
  PieceType.ROOK,
  PieceType.KNIGHT,
  PieceType.BISHOP,
  PieceType.QUEEN,
  PieceType.KING,
  PieceType.BISHOP,
  PieceType.KNIGHT,
  PieceType.ROOK,
]

function getTextureKey(color: PieceColor, type: PieceType) {
  if (color === PieceColor.BLACK) {
    if (type === PieceType.BISHOP) {
      return PieceTextureKey.BLACK_BISHOP
    }

    if (type === PieceType.KING) {
      return PieceTextureKey.BLACK_KING
    }

    if (type === PieceType.KNIGHT) {
      return PieceTextureKey.BLACK_KNIGHT
    }

    if (type === PieceType.PAWN) {
      return PieceTextureKey.BLACK_PAWN
    }

    if (type === PieceType.QUEEN) {
      return PieceTextureKey.BLACK_QUEEN
    }

    return PieceTextureKey.BLACK_ROOK
  }

  if (type === PieceType.BISHOP) {
    return PieceTextureKey.WHITE_BISHOP
  }

  if (type === PieceType.KING) {
    return PieceTextureKey.WHITE_KING
  }

  if (type === PieceType.KNIGHT) {
    return PieceTextureKey.WHITE_KNIGHT
  }

  if (type === PieceType.PAWN) {
    return PieceTextureKey.WHITE_PAWN
  }

  if (type === PieceType.QUEEN) {
    return PieceTextureKey.WHITE_QUEEN
  }

  return PieceTextureKey.WHITE_ROOK
}

function createBackRank(color: PieceColor, row: number) {
  return BACK_RANK_ORDER.map((type, col) => ({
    id: `${color}-${type}-${col}`,
    color,
    type,
    textureKey: getTextureKey(color, type),
    position: { row, col },
  }))
}

function createPawnRank(color: PieceColor, row: number) {
  return Array.from({ length: 8 }, (_, col) => ({
    id: `${color}-${PieceType.PAWN}-${col}`,
    color,
    type: PieceType.PAWN,
    textureKey: getTextureKey(color, PieceType.PAWN),
    position: { row, col },
  }))
}

function createInitialPieces(): PieceState[] {
  return [
    ...createBackRank(PieceColor.BLACK, 0),
    ...createPawnRank(PieceColor.BLACK, 1),
    ...createPawnRank(PieceColor.WHITE, 6),
    ...createBackRank(PieceColor.WHITE, 7),
  ]
}

export {
  createInitialPieces,
}
