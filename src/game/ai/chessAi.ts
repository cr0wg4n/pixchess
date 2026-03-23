export type ChessAiLevel = 1 | 2 | 3 | 4 | 5

export interface ChessAiMove {
  fromSquare: string
  toSquare: string
}

export interface ChessAiDecision {
  move: ChessAiMove | null
  analysis?: unknown
}

export interface ChessAiDecideOptions {
  level: ChessAiLevel
  randomness?: number
  includeAnalysis?: boolean
}

export interface ChessAiAdapter {
  syncPosition: (fen: string) => void
  decideMove: (options: ChessAiDecideOptions) => Promise<ChessAiDecision>
  dispose: () => void
}
