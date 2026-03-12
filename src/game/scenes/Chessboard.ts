import type { PieceState } from '@/game/types'
import { Scene } from 'phaser'
import { COLORS } from '@/config/ui'
import { createInitialPieces } from '@/game/domain/chessSetup'
import { ShadowBehavior } from '@/game/effects/ShadowBehavior'
import { VisualEffectsManager } from '@/game/effects/VisualEffectsManager'
import { BoardSquare } from '@/game/elements/BoardSquare'
import { Piece } from '@/game/elements/Piece'
import { PieceColor } from '@/game/types'

const BOARD_SIZE = 8
const TILE_SIZE = 60

export class ChessBoard extends Scene {
  squares: BoardSquare[][] = []
  pieces: Piece[] = []
  effects!: VisualEffectsManager

  constructor() {
    super('ChessBoard')
  }

  create() {
    this.effects = new VisualEffectsManager(this)
    this.events.once('shutdown', () => {
      this.effects.destroy()
    })

    const boardMetrics = this.getBoardMetrics()

    this.squares = this.createBoardRectangles(
      boardMetrics.offsetX,
      boardMetrics.offsetY,
    )
    this.pieces = this.createPieceSprites(
      createInitialPieces(),
      boardMetrics.offsetX,
      boardMetrics.offsetY,
    )
  }

  getBoardMetrics() {
    const size = BOARD_SIZE * TILE_SIZE

    return {
      size,
      offsetX: (this.scale.width - size) / 2,
      offsetY: (this.scale.height - size) / 2,
    }
  }

  createBoardRectangles(offsetX: number, offsetY: number) {
    const lightColor = COLORS.chessboard.light
    const darkColor = COLORS.chessboard.dark

    const board: BoardSquare[][] = []

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      const boardRow: BoardSquare[] = []

      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const isLight = (row + col) % 2 === 0
        const x = offsetX + col * TILE_SIZE
        const y = offsetY + row * TILE_SIZE
        const color = isLight ? lightColor : darkColor

        const square = new BoardSquare(this, row, col, x, y, TILE_SIZE, color)
        boardRow.push(square)
      }

      board.push(boardRow)
    }

    return board
  }

  createPieceSprites(pieceStates: PieceState[], offsetX: number, offsetY: number) {
    return pieceStates.map((pieceState) => {
      const x = offsetX + pieceState.position.col * TILE_SIZE + TILE_SIZE / 2
      const y = offsetY + pieceState.position.row * TILE_SIZE + TILE_SIZE / 2

      const piece = new Piece(this, x, y, pieceState.textureKey, pieceState.id)
      piece.fitToCell(TILE_SIZE, 10)
      this.effects.addEffect(piece, new ShadowBehavior(this, {
        alpha: pieceState.color === PieceColor.WHITE ? 0.20 : 0.15,
      }))

      return piece
    })
  }
}
