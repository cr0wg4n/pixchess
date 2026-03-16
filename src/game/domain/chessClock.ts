import { PieceColor } from '@/game/types'

interface ChessClockOptions {
  gameMinutes?: number
  incrementSeconds?: number
  activeColor?: PieceColor
}

export class ChessClock {
  private whiteMs: number
  private blackMs: number
  private incrementMs: number
  private activeColor: PieceColor

  constructor(options: ChessClockOptions = {}) {
    const gameMinutes = Number.isFinite(options.gameMinutes)
      ? Math.max(1, Math.floor(Number(options.gameMinutes)))
      : 10
    const incrementSeconds = Number.isFinite(options.incrementSeconds)
      ? Math.max(0, Math.floor(Number(options.incrementSeconds)))
      : 0
    const startMs = gameMinutes * 60 * 1000

    this.whiteMs = startMs
    this.blackMs = startMs
    this.incrementMs = incrementSeconds * 1000
    this.activeColor = options.activeColor ?? PieceColor.WHITE
  }

  setActiveColor(color: PieceColor) {
    this.activeColor = color
  }

  getRemaining(color: PieceColor) {
    return color === PieceColor.WHITE ? this.whiteMs : this.blackMs
  }

  completeMove(movingColor: PieceColor, nextTurn: PieceColor) {
    if (this.incrementMs > 0) {
      if (movingColor === PieceColor.WHITE) {
        this.whiteMs += this.incrementMs
      }
      else {
        this.blackMs += this.incrementMs
      }
    }

    this.activeColor = nextTurn
  }

  tick(deltaMs: number): PieceColor | null {
    const safeDelta = Math.max(0, deltaMs)

    if (this.activeColor === PieceColor.WHITE) {
      this.whiteMs = Math.max(0, this.whiteMs - safeDelta)

      if (this.whiteMs === 0) {
        return PieceColor.WHITE
      }

      return null
    }

    this.blackMs = Math.max(0, this.blackMs - safeDelta)

    if (this.blackMs === 0) {
      return PieceColor.BLACK
    }

    return null
  }
}
