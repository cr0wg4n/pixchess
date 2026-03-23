import type { EnPassantState } from '@/game/domain/pieceMoves'
import type { PieceState } from '@/game/types'
import { PieceColor, PieceType } from '@/game/types'

const PIECE_FEN_CHAR: Record<PieceType, string> = {
  [PieceType.BISHOP]: 'b',
  [PieceType.KING]: 'k',
  [PieceType.KNIGHT]: 'n',
  [PieceType.PAWN]: 'p',
  [PieceType.QUEEN]: 'q',
  [PieceType.ROOK]: 'r',
}

/**
 * Builds a FEN string from the current pixchess game state.
 * Piece IDs follow the pattern `${color}-${type}-${col}` from chessSetup.ts,
 * e.g. 'white-king-4', 'black-rook-7'.
 */
function buildFen(
  pieceStates: PieceState[],
  currentTurn: PieceColor,
  movedPieceIds: ReadonlySet<string>,
  enPassant: EnPassantState | null,
  fullMove: number,
): string {
  const ranks: string[] = []

  for (let row = 0; row <= 7; row++) {
    let rankStr = ''
    let emptyCount = 0

    for (let col = 0; col <= 7; col++) {
      const piece = pieceStates.find(p => p.position.row === row && p.position.col === col)

      if (piece) {
        if (emptyCount > 0) {
          rankStr += emptyCount
          emptyCount = 0
        }
        const char = PIECE_FEN_CHAR[piece.type]
        rankStr += piece.color === PieceColor.WHITE ? char.toUpperCase() : char
      }
      else {
        emptyCount++
      }
    }

    if (emptyCount > 0) {
      rankStr += emptyCount
    }
    ranks.push(rankStr)
  }

  const piecePlacement = ranks.join('/')
  const activeColor = currentTurn === PieceColor.WHITE ? 'w' : 'b'

  // Castling: king & rook IDs come from createInitialPieces() in chessSetup.ts
  let castling = ''

  if (!movedPieceIds.has('white-king-4') && pieceStates.some(p => p.id === 'white-king-4')) {
    if (!movedPieceIds.has('white-rook-7') && pieceStates.some(p => p.id === 'white-rook-7'))
      castling += 'K'
    if (!movedPieceIds.has('white-rook-0') && pieceStates.some(p => p.id === 'white-rook-0'))
      castling += 'Q'
  }

  if (!movedPieceIds.has('black-king-4') && pieceStates.some(p => p.id === 'black-king-4')) {
    if (!movedPieceIds.has('black-rook-7') && pieceStates.some(p => p.id === 'black-rook-7'))
      castling += 'k'
    if (!movedPieceIds.has('black-rook-0') && pieceStates.some(p => p.id === 'black-rook-0'))
      castling += 'q'
  }

  if (!castling)
    castling = '-'

  // En passant target square
  let epSquare = '-'

  if (enPassant) {
    const file = String.fromCharCode('a'.charCodeAt(0) + enPassant.captureSquare.col)
    const rank = 8 - enPassant.captureSquare.row
    epSquare = `${file}${rank}`
  }

  return `${piecePlacement} ${activeColor} ${castling} ${epSquare} 0 ${fullMove}`
}

/** Converts pixchess internal {row, col} to algebraic notation, e.g. {row:6,col:4} → "E2" */
function coordToSquare(row: number, col: number): string {
  const file = String.fromCharCode('A'.charCodeAt(0) + col)
  const rank = 8 - row
  return `${file}${rank}`
}

/** Converts algebraic notation to pixchess internal {row, col}, e.g. "E2" → {row:6, col:4} */
function squareToCoord(square: string): { row: number, col: number } {
  const upper = square.toUpperCase()
  const col = upper.charCodeAt(0) - 'A'.charCodeAt(0)
  const row = 8 - Number.parseInt(upper[1], 10)
  return { row, col }
}

export { buildFen, coordToSquare, squareToCoord }
