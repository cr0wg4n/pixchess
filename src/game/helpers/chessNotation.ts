import type { MoveEngineState, MoveResult } from '@/game/domain/moveEngine'
import type { CheckStatus, EnPassantState } from '@/game/domain/pieceMoves'
import type { PieceState } from '@/game/types'
import { getLegalMovesForPiece } from '@/game/domain/pieceMoves'
import { PieceType } from '@/game/types'

const FILES = 'abcdefgh'

function toAlgebraic(row: number, col: number) {
  const file = FILES[col] ?? 'a'
  const rank = 8 - row

  return `${file}${rank}`
}

function getPieceLetter(type: PieceType) {
  if (type === PieceType.KING) {
    return 'K'
  }

  if (type === PieceType.QUEEN) {
    return 'Q'
  }

  if (type === PieceType.ROOK) {
    return 'R'
  }

  if (type === PieceType.BISHOP) {
    return 'B'
  }

  if (type === PieceType.KNIGHT) {
    return 'N'
  }

  return ''
}

function getPromotionCode(type: PieceType | null | undefined) {
  if (type === PieceType.QUEEN) {
    return 'Q'
  }

  if (type === PieceType.ROOK) {
    return 'R'
  }

  if (type === PieceType.BISHOP) {
    return 'B'
  }

  if (type === PieceType.KNIGHT) {
    return 'N'
  }

  return ''
}

function getDisambiguation(
  piece: PieceState,
  target: { row: number, col: number },
  stateBeforeMove: {
    pieceStates: PieceState[]
    movedPieceIds: ReadonlySet<string>
    enPassant: EnPassantState | null
  },
) {
  const competingPieces = stateBeforeMove.pieceStates
    .filter(candidate => (
      candidate.id !== piece.id
      && candidate.color === piece.color
      && candidate.type === piece.type
    ))
    .filter((candidate) => {
      const candidateMoves = getLegalMovesForPiece(candidate, stateBeforeMove.pieceStates, {
        castling: {
          movedPieceIds: stateBeforeMove.movedPieceIds,
        },
        enPassant: stateBeforeMove.enPassant,
      })

      return candidateMoves.some(move => (
        move.row === target.row
        && move.col === target.col
      ))
    })

  if (competingPieces.length === 0) {
    return ''
  }

  const fromFile = FILES[piece.position.col]
  const fromRank = String(8 - piece.position.row)
  const sameFileExists = competingPieces.some(candidate => candidate.position.col === piece.position.col)
  const sameRankExists = competingPieces.some(candidate => candidate.position.row === piece.position.row)

  if (!sameFileExists) {
    return fromFile
  }

  if (!sameRankExists) {
    return fromRank
  }

  return `${fromFile}${fromRank}`
}

function buildSanBase(
  stateBeforeMove: MoveEngineState,
  moveResult: Pick<MoveResult, 'movedPiece' | 'capturedPieceIds'>,
) {
  const movedPieceBefore = stateBeforeMove.pieceStates.find(piece => piece.id === moveResult.movedPiece.pieceId)

  if (!movedPieceBefore) {
    return ''
  }

  const isCastling = (
    movedPieceBefore.type === PieceType.KING
    && moveResult.movedPiece.from.row === moveResult.movedPiece.to.row
    && Math.abs(moveResult.movedPiece.to.col - moveResult.movedPiece.from.col) === 2
  )

  if (isCastling) {
    return moveResult.movedPiece.to.col > moveResult.movedPiece.from.col
      ? 'O-O'
      : 'O-O-O'
  }

  const targetSquare = toAlgebraic(moveResult.movedPiece.to.row, moveResult.movedPiece.to.col)
  const isCapture = moveResult.capturedPieceIds.length > 0

  if (movedPieceBefore.type === PieceType.PAWN) {
    const fromFile = FILES[moveResult.movedPiece.from.col]

    if (isCapture) {
      return `${fromFile}x${targetSquare}`
    }

    return targetSquare
  }

  const pieceLetter = getPieceLetter(movedPieceBefore.type)
  const disambiguation = getDisambiguation(movedPieceBefore, moveResult.movedPiece.to, {
    pieceStates: stateBeforeMove.pieceStates,
    movedPieceIds: stateBeforeMove.movedPieceIds,
    enPassant: stateBeforeMove.enPassant,
  })
  const captureMarker = isCapture ? 'x' : ''

  return `${pieceLetter}${disambiguation}${captureMarker}${targetSquare}`
}

function buildAnnotatedSan(
  baseSan: string | null,
  checkStatus: CheckStatus,
  promotionType?: PieceType,
) {
  if (!baseSan) {
    return null
  }

  const promotionCode = getPromotionCode(promotionType)
  const promotionSuffix = promotionCode ? `=${promotionCode}` : ''
  const checkSuffix = checkStatus.isCheckmate
    ? '#'
    : checkStatus.inCheck
      ? '+'
      : ''

  return `${baseSan}${promotionSuffix}${checkSuffix}`
}

export {
  buildAnnotatedSan,
  buildSanBase,
}
