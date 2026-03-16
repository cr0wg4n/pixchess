import type { Scene } from 'phaser'
import type {
  CheckStatus,
  EnPassantState,
} from '@/game/domain/pieceMoves'
import type { BoardSquare } from '@/game/elements/BoardSquare'
import type { PieceState } from '@/game/types'
import { CHESS_HIGHLIGHTS } from '@/config/chessEffects'
import { getLegalMovesForPiece } from '@/game/domain/pieceMoves'
import {
  PieceType,
} from '@/game/types'

interface ChessboardInteractionState {
  checkStatus: CheckStatus
  currentTurn: PieceState['color']
  enPassant: EnPassantState | null
  isAwaitingPromotion: boolean
  isGameFinished: boolean
  movedPieceIds: ReadonlySet<string>
  pieceStates: PieceState[]
}

interface ChessboardInteractionCallbacks {
  moveSelectedPieceTo: (row: number, col: number) => void
}

class ChessboardInteractionController {
  private scene: Scene
  private squares: BoardSquare[][]
  private tileSize: number
  private selectedPieceId: string | null = null
  private legalTargets = new Set<string>()
  private legalCaptureTargets = new Set<string>()
  private hoverTargets = new Set<string>()
  private hoverCaptureTargets = new Set<string>()
  private lastMoveFromKey: string | null = null
  private lastMoveToKey: string | null = null
  private validMoveIndicators: Phaser.GameObjects.Arc[] = []

  constructor(scene: Scene, squares: BoardSquare[][], tileSize: number) {
    this.scene = scene
    this.squares = squares
    this.tileSize = tileSize
  }

  destroy() {
    for (const indicator of this.validMoveIndicators) {
      indicator.destroy()
    }

    this.validMoveIndicators = []
  }

  getSelectedPieceId() {
    return this.selectedPieceId
  }

  setLastMove(from: { row: number, col: number }, to: { row: number, col: number }) {
    this.lastMoveFromKey = this.toCoordinateKey(from.row, from.col)
    this.lastMoveToKey = this.toCoordinateKey(to.row, to.col)
  }

  setSquareHoverForPiece(pieceId: string, isHovering: boolean, state: ChessboardInteractionState) {
    const piece = state.pieceStates.find(candidate => candidate.id === pieceId)

    if (!piece) {
      return
    }

    const square = this.squares[piece.position.row]?.[piece.position.col]

    square?.setHoverState(isHovering)
  }

  clearSelection(state: ChessboardInteractionState) {
    this.selectedPieceId = null
    this.legalTargets.clear()
    this.legalCaptureTargets.clear()
    this.hoverTargets.clear()
    this.hoverCaptureTargets.clear()
    this.refreshHighlights(state)
  }

  clearHoverPreview(state: ChessboardInteractionState) {
    if (this.hoverTargets.size === 0) {
      return
    }

    this.hoverTargets.clear()
    this.hoverCaptureTargets.clear()
    this.refreshHighlights(state)
  }

  handleSquareHover(row: number, col: number, state: ChessboardInteractionState) {
    if (state.isGameFinished || state.isAwaitingPromotion) {
      return
    }

    const pieceAtSquare = state.pieceStates.find(piece => (
      piece.position.row === row
      && piece.position.col === col
      && piece.color === state.currentTurn
    ))

    if (!pieceAtSquare) {
      this.clearHoverPreview(state)
      return
    }

    const legalMoves = getLegalMovesForPiece(pieceAtSquare, state.pieceStates, this.getMoveContext(state))
    this.hoverTargets = new Set(legalMoves.map(move => this.toCoordinateKey(move.row, move.col)))
    this.hoverCaptureTargets = this.getCaptureTargetKeys(pieceAtSquare, legalMoves, state)
    this.refreshHighlights(state)
  }

  handlePieceHover(pieceId: string, state: ChessboardInteractionState) {
    if (state.isGameFinished || state.isAwaitingPromotion) {
      return
    }

    const piece = state.pieceStates.find(candidate => candidate.id === pieceId)

    if (!piece || piece.color !== state.currentTurn) {
      this.clearHoverPreview(state)
      return
    }

    const legalMoves = getLegalMovesForPiece(piece, state.pieceStates, this.getMoveContext(state))
    this.hoverTargets = new Set(legalMoves.map(move => this.toCoordinateKey(move.row, move.col)))
    this.hoverCaptureTargets = this.getCaptureTargetKeys(piece, legalMoves, state)
    this.refreshHighlights(state)
  }

  handlePieceSelection(
    pieceId: string,
    state: ChessboardInteractionState,
    callbacks: ChessboardInteractionCallbacks,
  ) {
    if (state.isGameFinished || state.isAwaitingPromotion) {
      return
    }

    const piece = state.pieceStates.find(candidate => candidate.id === pieceId)

    if (!piece) {
      return
    }

    if (this.selectedPieceId) {
      if (this.selectedPieceId === pieceId) {
        this.clearSelection(state)
        return
      }

      const key = this.toCoordinateKey(piece.position.row, piece.position.col)

      if (this.legalTargets.has(key)) {
        callbacks.moveSelectedPieceTo(piece.position.row, piece.position.col)
        return
      }

      if (piece.color !== state.currentTurn) {
        this.clearSelection(state)
        return
      }
    }

    if (piece.color !== state.currentTurn) {
      return
    }

    if (this.selectedPieceId === pieceId) {
      this.clearSelection(state)
      return
    }

    const legalMoves = getLegalMovesForPiece(piece, state.pieceStates, this.getMoveContext(state))

    this.selectedPieceId = pieceId
    this.legalTargets = new Set(legalMoves.map(move => this.toCoordinateKey(move.row, move.col)))
    this.legalCaptureTargets = this.getCaptureTargetKeys(piece, legalMoves, state)
    this.refreshHighlights(state)
  }

  handleSquareSelection(
    row: number,
    col: number,
    state: ChessboardInteractionState,
    callbacks: ChessboardInteractionCallbacks,
  ) {
    if (state.isGameFinished || state.isAwaitingPromotion) {
      return
    }

    const pieceAtSquare = state.pieceStates.find(piece => (
      piece.position.row === row
      && piece.position.col === col
    ))

    if (!this.selectedPieceId) {
      if (pieceAtSquare) {
        this.handlePieceSelection(pieceAtSquare.id, state, callbacks)
      }

      return
    }

    const key = this.toCoordinateKey(row, col)

    if (!this.legalTargets.has(key)) {
      if (pieceAtSquare && pieceAtSquare.color === state.currentTurn) {
        this.handlePieceSelection(pieceAtSquare.id, state, callbacks)
        return
      }

      this.clearSelection(state)
      return
    }

    callbacks.moveSelectedPieceTo(row, col)
  }

  refreshHighlights(state: ChessboardInteractionState) {
    const selectedPiece = this.selectedPieceId
      ? state.pieceStates.find(piece => piece.id === this.selectedPieceId)
      : null
    const selectedPieceKey = selectedPiece
      ? this.toCoordinateKey(selectedPiece.position.row, selectedPiece.position.col)
      : null
    const checkedKingKey = state.checkStatus.kingPosition && state.checkStatus.inCheck
      ? this.toCoordinateKey(state.checkStatus.kingPosition.row, state.checkStatus.kingPosition.col)
      : null

    for (const row of this.squares) {
      for (const square of row) {
        const key = this.toCoordinateKey(square.row, square.col)

        if (checkedKingKey && key === checkedKingKey) {
          square.setHighlight(
            CHESS_HIGHLIGHTS.checkedKing.strokeColor,
            CHESS_HIGHLIGHTS.checkedKing.fillColor,
            CHESS_HIGHLIGHTS.checkedKing.fillAlpha,
          )
          continue
        }

        if (selectedPieceKey && key === selectedPieceKey) {
          square.setHighlight(
            CHESS_HIGHLIGHTS.selectedPiece.strokeColor,
            CHESS_HIGHLIGHTS.selectedPiece.fillColor,
            CHESS_HIGHLIGHTS.selectedPiece.fillAlpha,
          )
          continue
        }

        if (key === this.lastMoveFromKey || key === this.lastMoveToKey) {
          square.setHighlight(
            CHESS_HIGHLIGHTS.selectedPiece.strokeColor,
            CHESS_HIGHLIGHTS.selectedPiece.fillColor,
            CHESS_HIGHLIGHTS.selectedPiece.fillAlpha,
          )
          continue
        }

        square.clearHighlight()
      }
    }

    this.refreshValidMoveIndicators()
  }

  private refreshValidMoveIndicators() {
    for (const indicator of this.validMoveIndicators) {
      indicator.destroy()
    }
    this.validMoveIndicators = []

    const validTargets = new Set<string>([
      ...this.legalTargets,
      ...this.hoverTargets,
    ])
    const captureTargets = new Set<string>([
      ...this.legalCaptureTargets,
      ...this.hoverCaptureTargets,
    ])

    if (validTargets.size === 0) {
      return
    }

    const normalRadius = this.tileSize * CHESS_HIGHLIGHTS.validMoveCircle.radiusMultiplier
    const captureRadius = this.tileSize * CHESS_HIGHLIGHTS.validMoveCircle.captureRadiusMultiplier

    for (const key of validTargets) {
      const [rowRaw, colRaw] = key.split(',')
      const row = Number(rowRaw)
      const col = Number(colRaw)
      const square = this.squares[row]?.[col]

      if (!square) {
        continue
      }

      const isCaptureTarget = captureTargets.has(key)
      const indicatorRadius = isCaptureTarget ? captureRadius : normalRadius

      const indicator = this.scene.add.circle(
        square.x + this.tileSize / 2,
        square.y + this.tileSize / 2,
        indicatorRadius,
        CHESS_HIGHLIGHTS.validMoveCircle.fillColor,
        isCaptureTarget ? 0 : CHESS_HIGHLIGHTS.validMoveCircle.fillAlpha,
      )

      if (isCaptureTarget) {
        indicator.setStrokeStyle(
          CHESS_HIGHLIGHTS.validMoveCircle.captureStrokeWidth,
          CHESS_HIGHLIGHTS.validMoveCircle.captureStrokeColor,
          CHESS_HIGHLIGHTS.validMoveCircle.captureStrokeAlpha,
        )
      }

      indicator.setDepth(7)
      this.validMoveIndicators.push(indicator)
    }
  }

  private getMoveContext(state: ChessboardInteractionState) {
    return {
      castling: {
        movedPieceIds: state.movedPieceIds,
      },
      enPassant: state.enPassant,
    }
  }

  private getCaptureTargetKeys(
    piece: PieceState,
    legalMoves: Array<{ row: number, col: number }>,
    state: ChessboardInteractionState,
  ) {
    const targets = new Set<string>()

    for (const move of legalMoves) {
      const occupant = state.pieceStates.find(candidate => (
        candidate.position.row === move.row
        && candidate.position.col === move.col
      ))

      if (occupant && occupant.color !== piece.color) {
        targets.add(this.toCoordinateKey(move.row, move.col))
        continue
      }

      if (
        piece.type === PieceType.PAWN
        && state.enPassant
        && state.enPassant.captureSquare.row === move.row
        && state.enPassant.captureSquare.col === move.col
      ) {
        targets.add(this.toCoordinateKey(move.row, move.col))
      }
    }

    return targets
  }

  private toCoordinateKey(row: number, col: number) {
    return `${row},${col}`
  }
}

export { ChessboardInteractionController }

export type {
  ChessboardInteractionCallbacks,
  ChessboardInteractionState,
}
