import type {
  ChessAiAdapter,
  ChessAiDecideOptions,
  ChessAiDecision,
  ChessAiLevel,
} from '@/game/ai/chessAi'

interface WorkerResponse {
  id: number
  move: { fromSquare: string, toSquare: string } | null
  analysis?: unknown
  error?: string
}

function clampAiLevel(level: number): ChessAiLevel {
  const clamped = Math.max(1, Math.min(5, Math.floor(level)))

  return clamped as ChessAiLevel
}

export class ChessEngineAdapter implements ChessAiAdapter {
  private worker: Worker
  private syncedFen: string | null = null
  private requestId = 0
  private disposed = false
  private pendingRequests = new Map<number, {
    resolve: (decision: ChessAiDecision) => void
    reject: (error: Error) => void
  }>()

  constructor() {
    this.worker = new Worker(new URL('./chessAIWorker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, move, analysis, error } = event.data
      const pending = this.pendingRequests.get(id)

      if (!pending) {
        return
      }

      this.pendingRequests.delete(id)

      if (error) {
        pending.reject(new Error(error))
        return
      }

      pending.resolve({ move, analysis })
    }
  }

  syncPosition(fen: string) {
    this.syncedFen = fen
  }

  decideMove(options: ChessAiDecideOptions): Promise<ChessAiDecision> {
    if (!this.syncedFen) {
      throw new Error('AI board is not initialized. Call syncPosition(fen) first.')
    }

    if (this.disposed) {
      throw new Error('AI adapter has been disposed.')
    }

    const id = ++this.requestId

    return new Promise<ChessAiDecision>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })

      this.worker.postMessage({
        id,
        fen: this.syncedFen,
        level: clampAiLevel(options.level),
        randomness: options.randomness ?? 0,
        includeAnalysis: options.includeAnalysis === true,
      })
    })
  }

  dispose() {
    this.disposed = true

    for (const pending of this.pendingRequests.values()) {
      pending.reject(new Error('AI adapter disposed while request was pending.'))
    }

    this.pendingRequests.clear()
    this.worker.terminate()
    this.syncedFen = null
  }
}

export function createChessAiAdapter(): ChessAiAdapter {
  return new ChessEngineAdapter()
}
