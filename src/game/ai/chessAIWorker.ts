import { Game } from 'js-chess-engine'

interface WorkerRequest {
  id: number
  fen: string
  level: number
  randomness: number
  includeAnalysis: boolean
}

interface WorkerResponse {
  id: number
  move: { fromSquare: string, toSquare: string } | null
  analysis?: unknown
  error?: string
}

globalThis.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, fen, level, randomness, includeAnalysis } = event.data

  try {
    const game = new Game(fen)
    const result = game.ai({
      level,
      play: false,
      randomness,
      analysis: includeAnalysis,
    })
    const entries = Object.entries(result.move as Record<string, string>)

    const payload: WorkerResponse = {
      id,
      move: entries.length > 0
        ? {
            fromSquare: entries[0][0],
            toSquare: entries[0][1],
          }
        : null,
      analysis: result.analysis,
    }

    globalThis.postMessage(payload)
  }
  catch (error) {
    const payload: WorkerResponse = {
      id,
      move: null,
      error: error instanceof Error ? error.message : 'AI worker failed',
    }

    globalThis.postMessage(payload)
  }
}
