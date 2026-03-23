import type { BoardCoordinate, PieceState } from '@/game/types'
import { PieceColor, PieceType } from '@/game/types'

const BOARD_SIZE = 8
const BOARD_MIN_INDEX = 0
const BOARD_MAX_INDEX = BOARD_SIZE - 1

const KNIGHT_OFFSETS: BoardCoordinate[] = [
  { row: -2, col: -1 },
  { row: -2, col: 1 },
  { row: -1, col: -2 },
  { row: -1, col: 2 },
  { row: 1, col: -2 },
  { row: 1, col: 2 },
  { row: 2, col: -1 },
  { row: 2, col: 1 },
]

const KING_OFFSETS: BoardCoordinate[] = [
  { row: -1, col: -1 },
  { row: -1, col: 0 },
  { row: -1, col: 1 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
]

const ORTHOGONAL_DIRECTIONS: BoardCoordinate[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
]

const DIAGONAL_DIRECTIONS: BoardCoordinate[] = [
  { row: -1, col: -1 },
  { row: -1, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 1 },
]

interface EnPassantState {
  captureSquare: BoardCoordinate
  targetPawnId: string
}

interface CastlingState {
  movedPieceIds: ReadonlySet<string>
}

interface MoveGenerationContext {
  enPassant: EnPassantState | null
  castling: CastlingState
}

interface CheckStatus {
  inCheck: boolean
  isCheckmate: boolean
  isDraw: boolean
  kingPosition: BoardCoordinate | null
}

function hasPieceMoved(context: MoveGenerationContext, pieceId: string) {
  return context.castling.movedPieceIds.has(pieceId)
}

function toCoordinateKey(position: BoardCoordinate) {
  return `${position.row},${position.col}`
}

function isWithinBoard(position: BoardCoordinate) {
  return (
    position.row >= BOARD_MIN_INDEX
    && position.row <= BOARD_MAX_INDEX
    && position.col >= BOARD_MIN_INDEX
    && position.col <= BOARD_MAX_INDEX
  )
}

function getPieceAtPosition(pieces: PieceState[], position: BoardCoordinate) {
  return pieces.find(piece => (
    piece.position.row === position.row
    && piece.position.col === position.col
  ))
}

function canOccupyPosition(piece: PieceState, pieces: PieceState[], position: BoardCoordinate) {
  const occupant = getPieceAtPosition(pieces, position)

  if (!occupant) {
    return true
  }

  return occupant.color !== piece.color
}

function getMovesFromOffsets(piece: PieceState, pieces: PieceState[], offsets: BoardCoordinate[]) {
  return offsets
    .map(offset => ({
      row: piece.position.row + offset.row,
      col: piece.position.col + offset.col,
    }))
    .filter(position => (
      isWithinBoard(position)
      && canOccupyPosition(piece, pieces, position)
    ))
}

function getSlidingMoves(piece: PieceState, pieces: PieceState[], directions: BoardCoordinate[]) {
  const moves: BoardCoordinate[] = []

  for (const direction of directions) {
    let row = piece.position.row + direction.row
    let col = piece.position.col + direction.col

    while (isWithinBoard({ row, col })) {
      const target = { row, col }
      const occupant = getPieceAtPosition(pieces, target)

      if (!occupant) {
        moves.push(target)
        row += direction.row
        col += direction.col
        continue
      }

      if (occupant.color !== piece.color) {
        moves.push(target)
      }

      break
    }
  }

  return moves
}

function getPawnMoves(piece: PieceState, pieces: PieceState[]) {
  const moves: BoardCoordinate[] = []
  const direction = piece.color === PieceColor.WHITE ? -1 : 1
  const startRow = piece.color === PieceColor.WHITE ? 6 : 1

  const oneStepForward = {
    row: piece.position.row + direction,
    col: piece.position.col,
  }

  if (isWithinBoard(oneStepForward) && !getPieceAtPosition(pieces, oneStepForward)) {
    moves.push(oneStepForward)

    const twoStepsForward = {
      row: piece.position.row + direction * 2,
      col: piece.position.col,
    }

    if (
      piece.position.row === startRow
      && isWithinBoard(twoStepsForward)
      && !getPieceAtPosition(pieces, twoStepsForward)
    ) {
      moves.push(twoStepsForward)
    }
  }

  for (const colOffset of [-1, 1]) {
    const diagonalTarget = {
      row: piece.position.row + direction,
      col: piece.position.col + colOffset,
    }

    if (!isWithinBoard(diagonalTarget)) {
      continue
    }

    const occupant = getPieceAtPosition(pieces, diagonalTarget)

    if (occupant && occupant.color !== piece.color) {
      moves.push(diagonalTarget)
    }
  }

  return moves
}

function getEnPassantMove(piece: PieceState, pieces: PieceState[], context: MoveGenerationContext) {
  if (piece.type !== PieceType.PAWN || !context.enPassant) {
    return null
  }

  const targetPawn = pieces.find(candidate => candidate.id === context.enPassant?.targetPawnId)

  if (!targetPawn || targetPawn.type !== PieceType.PAWN || targetPawn.color === piece.color) {
    return null
  }

  const direction = piece.color === PieceColor.WHITE ? -1 : 1
  const { captureSquare } = context.enPassant
  const isOneStepForward = captureSquare.row === piece.position.row + direction
  const isAdjacentFile = Math.abs(captureSquare.col - piece.position.col) === 1
  const targetSquareOccupant = getPieceAtPosition(pieces, captureSquare)

  if (!isOneStepForward || !isAdjacentFile || targetSquareOccupant) {
    return null
  }

  const isTargetPawnAdjacent = (
    targetPawn.position.row === piece.position.row
    && Math.abs(targetPawn.position.col - piece.position.col) === 1
  )

  if (!isTargetPawnAdjacent) {
    return null
  }

  return captureSquare
}

function getKnightAttackSquares(piece: PieceState) {
  return KNIGHT_OFFSETS
    .map(offset => ({
      row: piece.position.row + offset.row,
      col: piece.position.col + offset.col,
    }))
    .filter(isWithinBoard)
}

function getKingAttackSquares(piece: PieceState) {
  return KING_OFFSETS
    .map(offset => ({
      row: piece.position.row + offset.row,
      col: piece.position.col + offset.col,
    }))
    .filter(isWithinBoard)
}

function getPawnAttackSquares(piece: PieceState) {
  const direction = piece.color === PieceColor.WHITE ? -1 : 1

  return [-1, 1]
    .map(colOffset => ({
      row: piece.position.row + direction,
      col: piece.position.col + colOffset,
    }))
    .filter(isWithinBoard)
}

function isSquareAttackedByColor(pieces: PieceState[], byColor: PieceColor, square: BoardCoordinate) {
  for (const piece of pieces) {
    if (piece.color !== byColor) {
      continue
    }

    if (piece.type === PieceType.PAWN) {
      const attacks = getPawnAttackSquares(piece)

      if (attacks.some(attack => attack.row === square.row && attack.col === square.col)) {
        return true
      }

      continue
    }

    if (piece.type === PieceType.KNIGHT) {
      const attacks = getKnightAttackSquares(piece)

      if (attacks.some(attack => attack.row === square.row && attack.col === square.col)) {
        return true
      }

      continue
    }

    if (piece.type === PieceType.KING) {
      const attacks = getKingAttackSquares(piece)

      if (attacks.some(attack => attack.row === square.row && attack.col === square.col)) {
        return true
      }

      continue
    }

    const directions = piece.type === PieceType.BISHOP
      ? DIAGONAL_DIRECTIONS
      : piece.type === PieceType.ROOK
        ? ORTHOGONAL_DIRECTIONS
        : [...ORTHOGONAL_DIRECTIONS, ...DIAGONAL_DIRECTIONS]

    const attacks = getSlidingMoves(piece, pieces, directions)

    if (attacks.some(attack => attack.row === square.row && attack.col === square.col)) {
      return true
    }
  }

  return false
}

function withKingAtSquare(pieces: PieceState[], kingId: string, square: BoardCoordinate) {
  return pieces.map(piece => (
    piece.id === kingId
      ? {
          ...piece,
          position: { row: square.row, col: square.col },
        }
      : piece
  ))
}

function getCastlingMoves(piece: PieceState, pieces: PieceState[], context: MoveGenerationContext) {
  if (piece.type !== PieceType.KING) {
    return []
  }

  if (hasPieceMoved(context, piece.id)) {
    return []
  }

  const enemyColor = piece.color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE

  if (isSquareAttackedByColor(pieces, enemyColor, piece.position)) {
    return []
  }

  const castlingMoves: BoardCoordinate[] = []
  const candidateRooks = pieces.filter(candidate => (
    candidate.color === piece.color
    && candidate.type === PieceType.ROOK
    && candidate.position.row === piece.position.row
  ))

  for (const rook of candidateRooks) {
    // Castling is forbidden once this rook has moved at least once.
    if (hasPieceMoved(context, rook.id)) {
      continue
    }

    const direction = rook.position.col > piece.position.col ? 1 : -1
    const squaresBetween: BoardCoordinate[] = []

    for (let col = piece.position.col + direction; col !== rook.position.col; col += direction) {
      squaresBetween.push({ row: piece.position.row, col })
    }

    const hasPieceInBetween = squaresBetween.some(square => getPieceAtPosition(pieces, square))

    if (hasPieceInBetween) {
      continue
    }

    const kingPathSquares = [
      { row: piece.position.row, col: piece.position.col + direction },
      { row: piece.position.row, col: piece.position.col + direction * 2 },
    ]

    if (kingPathSquares.some(square => !isWithinBoard(square))) {
      continue
    }

    const isPathAttacked = kingPathSquares.some((square) => {
      const piecesWithKingMoved = withKingAtSquare(pieces, piece.id, square)

      return isSquareAttackedByColor(piecesWithKingMoved, enemyColor, square)
    })

    if (isPathAttacked) {
      continue
    }

    castlingMoves.push(kingPathSquares[1])
  }

  return castlingMoves
}

function getCastlingRookReposition(piece: PieceState, pieces: PieceState[], target: BoardCoordinate) {
  if (piece.type !== PieceType.KING || Math.abs(target.col - piece.position.col) !== 2) {
    return null
  }

  const direction = target.col > piece.position.col ? 1 : -1
  const rookCandidates = pieces
    .filter(candidate => (
      candidate.id !== piece.id
      && candidate.type === PieceType.ROOK
      && candidate.color === piece.color
      && candidate.position.row === piece.position.row
      && (direction > 0
        ? candidate.position.col > piece.position.col
        : candidate.position.col < piece.position.col)
    ))
    .sort((a, b) => (
      Math.abs(a.position.col - piece.position.col) - Math.abs(b.position.col - piece.position.col)
    ))

  const rook = rookCandidates[0]

  if (!rook) {
    return null
  }

  return {
    rookId: rook.id,
    target: {
      row: piece.position.row,
      col: target.col - direction,
    },
  }
}

function applyMoveToPieces(
  piece: PieceState,
  target: BoardCoordinate,
  pieces: PieceState[],
  context: MoveGenerationContext,
) {
  const capturedPieceIds = new Set<string>()
  const directCapture = getPieceAtPosition(pieces, target)

  if (directCapture && directCapture.color !== piece.color) {
    capturedPieceIds.add(directCapture.id)
  }

  if (
    piece.type === PieceType.PAWN
    && context.enPassant
    && target.row === context.enPassant.captureSquare.row
    && target.col === context.enPassant.captureSquare.col
    && !directCapture
  ) {
    capturedPieceIds.add(context.enPassant.targetPawnId)
  }

  const castlingRookReposition = getCastlingRookReposition(piece, pieces, target)

  return pieces
    .filter(current => !capturedPieceIds.has(current.id))
    .map((current) => {
      if (current.id === piece.id) {
        return {
          ...current,
          position: { row: target.row, col: target.col },
        }
      }

      if (castlingRookReposition && current.id === castlingRookReposition.rookId) {
        return {
          ...current,
          position: {
            row: castlingRookReposition.target.row,
            col: castlingRookReposition.target.col,
          },
        }
      }

      return current
    })
}

function getKingPiece(color: PieceColor, pieces: PieceState[]) {
  return pieces.find(piece => piece.type === PieceType.KING && piece.color === color) ?? null
}

function isKingInCheck(color: PieceColor, pieces: PieceState[]) {
  const king = getKingPiece(color, pieces)

  if (!king) {
    return false
  }

  const enemyColor = color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE

  return isSquareAttackedByColor(pieces, enemyColor, king.position)
}

function getPieceMoves(piece: PieceState, pieces: PieceState[], context: MoveGenerationContext) {
  if (piece.type === PieceType.PAWN) {
    const pawnMoves = getPawnMoves(piece, pieces)
    const enPassantMove = getEnPassantMove(piece, pieces, context)

    if (enPassantMove) {
      pawnMoves.push(enPassantMove)
    }

    return pawnMoves
  }

  if (piece.type === PieceType.KNIGHT) {
    return getMovesFromOffsets(piece, pieces, KNIGHT_OFFSETS)
  }

  if (piece.type === PieceType.BISHOP) {
    return getSlidingMoves(piece, pieces, DIAGONAL_DIRECTIONS)
  }

  if (piece.type === PieceType.ROOK) {
    return getSlidingMoves(piece, pieces, ORTHOGONAL_DIRECTIONS)
  }

  if (piece.type === PieceType.QUEEN) {
    return getSlidingMoves(piece, pieces, [
      ...ORTHOGONAL_DIRECTIONS,
      ...DIAGONAL_DIRECTIONS,
    ])
  }

  const kingMoves = getMovesFromOffsets(piece, pieces, KING_OFFSETS)

  if (piece.type === PieceType.KING) {
    kingMoves.push(...getCastlingMoves(piece, pieces, context))
  }

  return kingMoves
}

function getLegalMovesForPiece(piece: PieceState, pieces: PieceState[], context?: MoveGenerationContext) {
  const resolvedContext: MoveGenerationContext = {
    enPassant: context?.enPassant ?? null,
    castling: {
      movedPieceIds: context?.castling.movedPieceIds ?? new Set<string>(),
    },
  }

  const candidateMoves = getPieceMoves(piece, pieces, resolvedContext)

  return candidateMoves.filter((candidateMove) => {
    const nextPieces = applyMoveToPieces(piece, candidateMove, pieces, resolvedContext)

    return !isKingInCheck(piece.color, nextPieces)
  })
}

function getLegalMovesByPiece(pieces: PieceState[], context?: MoveGenerationContext) {
  const legalMovesByPiece = new Map<string, BoardCoordinate[]>()

  for (const piece of pieces) {
    legalMovesByPiece.set(piece.id, getLegalMovesForPiece(piece, pieces, context))
  }

  return legalMovesByPiece
}

function isLegalMove(piece: PieceState, target: BoardCoordinate, pieces: PieceState[], context?: MoveGenerationContext) {
  if (!isWithinBoard(target)) {
    return false
  }

  const legalMoves = getLegalMovesForPiece(piece, pieces, context)
  const targetKey = toCoordinateKey(target)

  return legalMoves.some(move => toCoordinateKey(move) === targetKey)
}

function getCheckStatus(color: PieceColor, pieces: PieceState[], context?: MoveGenerationContext): CheckStatus {
  const king = getKingPiece(color, pieces)

  if (!king) {
    return {
      inCheck: false,
      isCheckmate: false,
      isDraw: false,
      kingPosition: null,
    }
  }

  const inCheck = isKingInCheck(color, pieces)
  const hasAnyLegalMove = pieces
    .filter(piece => piece.color === color)
    .some(piece => getLegalMovesForPiece(piece, pieces, context).length > 0)

  if (!inCheck) {
    return {
      inCheck: false,
      isCheckmate: false,
      isDraw: !hasAnyLegalMove,
      kingPosition: king.position,
    }
  }

  return {
    inCheck: true,
    isCheckmate: !hasAnyLegalMove,
    isDraw: false,
    kingPosition: king.position,
  }
}

export {
  type CastlingState,
  type CheckStatus,
  type EnPassantState,
  getCheckStatus,
  getLegalMovesByPiece,
  getLegalMovesForPiece,
  getPieceAtPosition,
  isKingInCheck,
  isLegalMove,
  isWithinBoard,
  type MoveGenerationContext,
}
