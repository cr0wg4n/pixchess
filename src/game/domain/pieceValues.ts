import type { PieceType } from '@/game/types'
import { PieceType as PieceTypeValue } from '@/game/types'

const PIECE_VALUES: Record<PieceType, number> = {
  [PieceTypeValue.PAWN]: 1,
  [PieceTypeValue.KNIGHT]: 3,
  [PieceTypeValue.BISHOP]: 3,
  [PieceTypeValue.ROOK]: 5,
  [PieceTypeValue.QUEEN]: 9,
  [PieceTypeValue.KING]: 100,
}

function getPieceValue(pieceType: PieceType) {
  return PIECE_VALUES[pieceType]
}

export {
  getPieceValue,
  PIECE_VALUES,
}
