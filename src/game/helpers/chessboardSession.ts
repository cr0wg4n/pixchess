import type { EnPassantState } from '@/game/domain/pieceMoves'
import type { PieceState } from '@/game/types'
import { createInitialPieces } from '@/game/domain/chessSetup'
import { createEmptyPgnHeaders, importPgn } from '@/game/helpers/pgn'
import { PieceColor } from '@/game/types'

const DEFAULT_WHITE_PLAYER_NAME = 'White Player'
const DEFAULT_BLACK_PLAYER_NAME = 'Black Player'
const DEFAULT_GAME_MINUTES = 10
const DEFAULT_INCREMENT_SECONDS = 0

interface ChessBoardSceneData {
  pgn?: string
  gameMinutes?: number
  incrementSeconds?: number
  whitePlayer?: string
  blackPlayer?: string
}

interface ResolvedChessBoardSceneData {
  preloadPgn: string | null
  gameMinutes: number
  incrementSeconds: number
  whitePlayerName: string
  blackPlayerName: string
}

interface ChessBoardGameState {
  pieceStates: PieceState[]
  movedPieceIds: Set<string>
  enPassant: EnPassantState | null
  currentTurn: PieceColor
  pgnHeaders: Record<string, string>
  pgnMoves: string[]
  pgnResult: string
}

interface ChessBoardGameStateResult {
  error: unknown | null
  gameState: ChessBoardGameState
}

function resolvePlayerName(name: string | undefined, fallback: string) {
  return typeof name === 'string' && name.trim().length > 0
    ? name.trim()
    : fallback
}

function createDefaultChessBoardGameState(): ChessBoardGameState {
  return {
    pieceStates: createInitialPieces(),
    movedPieceIds: new Set<string>(),
    enPassant: null,
    currentTurn: PieceColor.WHITE,
    pgnHeaders: createEmptyPgnHeaders(),
    pgnMoves: [],
    pgnResult: '*',
  }
}

function resolveChessBoardSceneData(data: ChessBoardSceneData = {}): ResolvedChessBoardSceneData {
  return {
    preloadPgn: typeof data.pgn === 'string' ? data.pgn : null,
    gameMinutes: Number.isFinite(data.gameMinutes)
      ? Math.max(1, Math.floor(Number(data.gameMinutes)))
      : DEFAULT_GAME_MINUTES,
    incrementSeconds: Number.isFinite(data.incrementSeconds)
      ? Math.max(0, Math.floor(Number(data.incrementSeconds)))
      : DEFAULT_INCREMENT_SECONDS,
    whitePlayerName: resolvePlayerName(data.whitePlayer, DEFAULT_WHITE_PLAYER_NAME),
    blackPlayerName: resolvePlayerName(data.blackPlayer, DEFAULT_BLACK_PLAYER_NAME),
  }
}

function loadChessBoardGameState(preloadPgn: string | null): ChessBoardGameStateResult {
  if (!preloadPgn) {
    return {
      error: null,
      gameState: createDefaultChessBoardGameState(),
    }
  }

  try {
    const imported = importPgn(preloadPgn)

    return {
      error: null,
      gameState: {
        pieceStates: imported.state.pieceStates,
        movedPieceIds: new Set(imported.state.movedPieceIds),
        enPassant: imported.state.enPassant,
        currentTurn: imported.state.currentTurn,
        pgnHeaders: {
          ...createEmptyPgnHeaders(),
          ...imported.headers,
        },
        pgnMoves: [...imported.moves],
        pgnResult: imported.result ?? '*',
      },
    }
  }
  catch (error) {
    return {
      error,
      gameState: createDefaultChessBoardGameState(),
    }
  }
}

export {
  loadChessBoardGameState,
  resolveChessBoardSceneData,
}

export type {
  ChessBoardGameState,
  ChessBoardSceneData,
  ResolvedChessBoardSceneData,
}
