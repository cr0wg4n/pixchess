import type {
  EnPassantState,
  MoveGenerationContext,
} from '@/game/domain/pieceMoves'
import type {
  BoardCoordinate,
  PieceState,
} from '@/game/types'
import {
  getLegalMovesForPiece,
} from '@/game/domain/pieceMoves'
import {
  PieceColor,
  PieceType,
} from '@/game/types'

interface MoveEngineState {
  pieceStates: PieceState[]
  movedPieceIds: ReadonlySet<string>
  enPassant: EnPassantState | null
  currentTurn: PieceColor
}

interface MoveCommand {
  pieceId: string
  target: BoardCoordinate
}

interface PieceMoveSummary {
  pieceId: string
  from: BoardCoordinate
  to: BoardCoordinate
}

interface MoveResult {
  pieceStates: PieceState[]
  movedPieceIds: Set<string>
  enPassant: EnPassantState | null
  currentTurn: PieceColor
  movedPiece: PieceMoveSummary
  rookMove: PieceMoveSummary | null
  capturedPieceIds: string[]
}

function toCoordinateKey(position: BoardCoordinate) {
  return `${position.row},${position.col}`
}

function getPieceStateById(pieces: PieceState[], pieceId: string) {
  return pieces.find(piece => piece.id === pieceId)
}

function buildMoveContext(state: MoveEngineState): MoveGenerationContext {
  return {
    castling: {
      movedPieceIds: state.movedPieceIds,
    },
    enPassant: state.enPassant,
  }
}

function getEnPassantCapturedPawnId(
  movingPiece: PieceState,
  target: BoardCoordinate,
  directCapturedPiece: PieceState | undefined,
  enPassant: EnPassantState | null,
) {
  if (
    movingPiece.type !== PieceType.PAWN
    || !enPassant
    || directCapturedPiece
    || enPassant.captureSquare.row !== target.row
    || enPassant.captureSquare.col !== target.col
  ) {
    return null
  }

  return enPassant.targetPawnId
}

function getCastlingRookMove(
  pieces: PieceState[],
  movingPiece: PieceState,
  origin: BoardCoordinate,
  target: BoardCoordinate,
) {
  if (
    movingPiece.type !== PieceType.KING
    || origin.row !== target.row
    || Math.abs(target.col - origin.col) !== 2
  ) {
    return null
  }

  const direction = target.col > origin.col ? 1 : -1
  const rookCandidates = pieces
    .filter(piece => (
      piece.id !== movingPiece.id
      && piece.type === PieceType.ROOK
      && piece.color === movingPiece.color
      && piece.position.row === origin.row
      && (direction > 0 ? piece.position.col > origin.col : piece.position.col < origin.col)
    ))
    .sort((a, b) => (
      Math.abs(a.position.col - origin.col) - Math.abs(b.position.col - origin.col)
    ))

  const rook = rookCandidates[0]

  if (!rook) {
    return null
  }

  return {
    pieceId: rook.id,
    from: { row: rook.position.row, col: rook.position.col },
    to: { row: origin.row, col: target.col - direction },
  }
}

function updateEnPassantState(movedPiece: PieceState, origin: BoardCoordinate) {
  if (movedPiece.type !== PieceType.PAWN) {
    return null
  }

  const rowDelta = movedPiece.position.row - origin.row

  if (Math.abs(rowDelta) !== 2) {
    return null
  }

  return {
    captureSquare: {
      row: origin.row + rowDelta / 2,
      col: origin.col,
    },
    targetPawnId: movedPiece.id,
  }
}

function getNextTurn(currentTurn: PieceColor) {
  return currentTurn === PieceColor.WHITE
    ? PieceColor.BLACK
    : PieceColor.WHITE
}

function applyMove(state: MoveEngineState, command: MoveCommand): MoveResult | null {
  const movingPiece = getPieceStateById(state.pieceStates, command.pieceId)

  if (!movingPiece || movingPiece.color !== state.currentTurn) {
    return null
  }

  const legalMoves = getLegalMovesForPiece(movingPiece, state.pieceStates, buildMoveContext(state))
  const targetKey = toCoordinateKey(command.target)
  const isTargetLegal = legalMoves.some(move => toCoordinateKey(move) === targetKey)

  if (!isTargetLegal) {
    return null
  }

  const origin = {
    row: movingPiece.position.row,
    col: movingPiece.position.col,
  }

  const directCapturedPiece = state.pieceStates.find(piece => (
    piece.id !== movingPiece.id
    && piece.position.row === command.target.row
    && piece.position.col === command.target.col
  ))

  const enPassantCapturedPawnId = getEnPassantCapturedPawnId(
    movingPiece,
    command.target,
    directCapturedPiece,
    state.enPassant,
  )

  const capturedPieceIds = [
    ...(directCapturedPiece ? [directCapturedPiece.id] : []),
    ...(enPassantCapturedPawnId ? [enPassantCapturedPawnId] : []),
  ]

  const rookMove = getCastlingRookMove(state.pieceStates, movingPiece, origin, command.target)

  const pieceStatesWithoutCaptures = state.pieceStates.filter(piece => !capturedPieceIds.includes(piece.id))

  const pieceStatesAfterMove = pieceStatesWithoutCaptures.map((piece) => {
    if (piece.id === movingPiece.id) {
      return {
        ...piece,
        position: { row: command.target.row, col: command.target.col },
      }
    }

    if (rookMove && piece.id === rookMove.pieceId) {
      return {
        ...piece,
        position: { row: rookMove.to.row, col: rookMove.to.col },
      }
    }

    return piece
  })

  const movedPieceAfterMove = getPieceStateById(pieceStatesAfterMove, movingPiece.id)

  if (!movedPieceAfterMove) {
    return null
  }

  const movedPieceIds = new Set(state.movedPieceIds)

  for (const capturedPieceId of capturedPieceIds) {
    movedPieceIds.delete(capturedPieceId)
  }

  movedPieceIds.add(movingPiece.id)

  if (rookMove) {
    movedPieceIds.add(rookMove.pieceId)
  }

  return {
    pieceStates: pieceStatesAfterMove,
    movedPieceIds,
    enPassant: updateEnPassantState(movedPieceAfterMove, origin),
    currentTurn: getNextTurn(state.currentTurn),
    movedPiece: {
      pieceId: movingPiece.id,
      from: origin,
      to: { row: command.target.row, col: command.target.col },
    },
    rookMove,
    capturedPieceIds,
  }
}

export {
  applyMove,
  type MoveCommand,
  type MoveEngineState,
  type MoveResult,
}
