import type {
  ChessAiAdapter,
  ChessAiDecideOptions,
  ChessAiDecision,
  ChessAiLevel,
} from '@/game/ai/chessAi'
import { Game } from 'js-chess-engine'

function clampAiLevel(level: number): ChessAiLevel {
  const clamped = Math.max(1, Math.min(5, Math.floor(level)))

  return clamped as ChessAiLevel
}

export class ChessEngineAdapter implements ChessAiAdapter {
  private board: Game | null = null
  private syncedFen: string | null = null

  syncPosition(fen: string) {
    if (!this.board || this.syncedFen !== fen) {
      this.board = new Game(fen)
      this.syncedFen = fen
    }
  }

  decideMove(options: ChessAiDecideOptions): ChessAiDecision {
    if (!this.board) {
      throw new Error('AI board is not initialized. Call syncPosition(fen) first.')
    }

    const result = this.board.ai({
      level: clampAiLevel(options.level),
      play: false,
      randomness: options.randomness ?? 0,
      analysis: options.includeAnalysis === true,
    })

    const entries = Object.entries(result.move as Record<string, string>)

    if (entries.length === 0) {
      return {
        move: null,
        analysis: result.analysis,
      }
    }

    const [fromSquare, toSquare] = entries[0]

    return {
      move: {
        fromSquare,
        toSquare,
      },
      analysis: result.analysis,
    }
  }

  dispose() {
    this.board = null
    this.syncedFen = null
  }
}

export function createChessAiAdapter(): ChessAiAdapter {
  return new ChessEngineAdapter()
}
