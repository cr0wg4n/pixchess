import type { MoveEngineState } from '@/game/domain/moveEngine'
import type { EnPassantState } from '@/game/domain/pieceMoves'
import type {
  BoardCoordinate,
  PieceState,
} from '@/game/types'
import { createInitialPieces } from '@/game/domain/chessSetup'
import { applyMove } from '@/game/domain/moveEngine'
import { getLegalMovesForPiece } from '@/game/domain/pieceMoves'
import {
  PieceColor,
  PieceTextureKey,
  PieceType,
} from '@/game/types'

interface PgnImportResult {
  headers: Record<string, string>
  moves: string[]
  result: string | null
  state: MoveEngineState
}

interface PgnExportOptions {
  headers?: Record<string, string>
  moves: string[]
  result?: string
}

type PromotionCode = 'Q' | 'R' | 'B' | 'N'

const FILES = 'abcdefgh'
const RESULTS = new Set(['1-0', '0-1', '1/2-1/2', '*'])
const HEADER_REGEX = /^\[(\w+)\s+"([^"]*)"\]$/gm
const HEADER_LINE_REGEX = /^\s*\[[^\]]*\]\s*$/gm
const BRACE_COMMENT_REGEX = /\{[^}]*\}/g
const LINE_COMMENT_REGEX = /;[^\n\r]*/g
const NAG_REGEX = /\$\d+/g
const MOVE_NUMBER_REGEX = /\d+\.(\.\.)?/g
const SPACE_SPLIT_REGEX = /\s+/
const ELLIPSIS_REGEX = /\u2026/g
const ANNOTATION_REGEX = /[!?]+/g
const EN_PASSANT_SUFFIX_REGEX = /e\.p\.?/gi
const CHECK_SUFFIX_REGEX = /[+#]+$/g
const ZERO_CASTLE_LONG_REGEX = /0-0-0/g
const ZERO_CASTLE_SHORT_REGEX = /0-0/g
const SAN_MOVE_REGEX = /^(?<piece>[KQRBN]?)(?<fromFile>[a-h]?)(?<fromRank>[1-8]?)(?<capture>x?)(?<toFile>[a-h])(?<toRank>[1-8])(?:=(?<promotion>[QRBN]))?$/

function fileToCol(file: string) {
  return FILES.indexOf(file)
}

function rankToRow(rank: string) {
  return 8 - Number(rank)
}

function toCoordinateKey(position: BoardCoordinate) {
  return `${position.row},${position.col}`
}

function getPieceTextureKey(color: PieceColor, type: PieceType) {
  if (color === PieceColor.BLACK) {
    if (type === PieceType.BISHOP) {
      return PieceTextureKey.BLACK_BISHOP
    }

    if (type === PieceType.KING) {
      return PieceTextureKey.BLACK_KING
    }

    if (type === PieceType.KNIGHT) {
      return PieceTextureKey.BLACK_KNIGHT
    }

    if (type === PieceType.PAWN) {
      return PieceTextureKey.BLACK_PAWN
    }

    if (type === PieceType.QUEEN) {
      return PieceTextureKey.BLACK_QUEEN
    }

    return PieceTextureKey.BLACK_ROOK
  }

  if (type === PieceType.BISHOP) {
    return PieceTextureKey.WHITE_BISHOP
  }

  if (type === PieceType.KING) {
    return PieceTextureKey.WHITE_KING
  }

  if (type === PieceType.KNIGHT) {
    return PieceTextureKey.WHITE_KNIGHT
  }

  if (type === PieceType.PAWN) {
    return PieceTextureKey.WHITE_PAWN
  }

  if (type === PieceType.QUEEN) {
    return PieceTextureKey.WHITE_QUEEN
  }

  return PieceTextureKey.WHITE_ROOK
}

function parsePieceType(code: string | undefined) {
  if (!code) {
    return PieceType.PAWN
  }

  if (code === 'K') {
    return PieceType.KING
  }

  if (code === 'Q') {
    return PieceType.QUEEN
  }

  if (code === 'R') {
    return PieceType.ROOK
  }

  if (code === 'B') {
    return PieceType.BISHOP
  }

  return PieceType.KNIGHT
}

function parsePromotionType(code: PromotionCode | undefined) {
  if (!code) {
    return null
  }

  if (code === 'Q') {
    return PieceType.QUEEN
  }

  if (code === 'R') {
    return PieceType.ROOK
  }

  if (code === 'B') {
    return PieceType.BISHOP
  }

  return PieceType.KNIGHT
}

function parseHeaders(pgn: string) {
  const headers: Record<string, string> = {}
  let match = HEADER_REGEX.exec(pgn)

  while (match) {
    const [, key, value] = match
    headers[key] = value
    match = HEADER_REGEX.exec(pgn)
  }

  HEADER_REGEX.lastIndex = 0

  return headers
}

function stripVariations(pgnMoves: string) {
  let output = ''
  let depth = 0

  for (const character of pgnMoves) {
    if (character === '(') {
      depth += 1
      continue
    }

    if (character === ')') {
      depth = Math.max(0, depth - 1)
      continue
    }

    if (depth === 0) {
      output += character
    }
  }

  return output
}

function extractMoveTokens(pgn: string) {
  const withoutHeaders = pgn.replace(HEADER_LINE_REGEX, ' ')
  const withoutComments = withoutHeaders
    .replace(BRACE_COMMENT_REGEX, ' ')
    .replace(LINE_COMMENT_REGEX, ' ')
  const withoutVariations = stripVariations(withoutComments)

  return withoutVariations
    .replace(NAG_REGEX, ' ')
    .replace(MOVE_NUMBER_REGEX, ' ')
    .trim()
    .split(SPACE_SPLIT_REGEX)
    .filter(Boolean)
}

function normalizeSanToken(token: string) {
  return token
    .replace(ELLIPSIS_REGEX, '')
    .replace(ANNOTATION_REGEX, '')
    .replace(EN_PASSANT_SUFFIX_REGEX, '')
    .replace(CHECK_SUFFIX_REGEX, '')
    .replace(ZERO_CASTLE_LONG_REGEX, 'O-O-O')
    .replace(ZERO_CASTLE_SHORT_REGEX, 'O-O')
    .trim()
}

function isEnPassantCapture(
  piece: PieceState,
  target: BoardCoordinate,
  enPassant: EnPassantState | null,
) {
  return (
    piece.type === PieceType.PAWN
    && !!enPassant
    && enPassant.captureSquare.row === target.row
    && enPassant.captureSquare.col === target.col
  )
}

function isCaptureMove(state: MoveEngineState, piece: PieceState, target: BoardCoordinate) {
  const occupant = state.pieceStates.find(candidate => (
    candidate.position.row === target.row
    && candidate.position.col === target.col
  ))

  if (occupant && occupant.color !== piece.color) {
    return true
  }

  return isEnPassantCapture(piece, target, state.enPassant)
}

function resolveCastlingMove(state: MoveEngineState, san: string) {
  if (san !== 'O-O' && san !== 'O-O-O') {
    return null
  }

  const king = state.pieceStates.find(piece => (
    piece.color === state.currentTurn
    && piece.type === PieceType.KING
  ))

  if (!king) {
    throw new Error(`Missing king for ${state.currentTurn}`)
  }

  const targetCol = san === 'O-O' ? 6 : 2

  return {
    pieceId: king.id,
    target: {
      row: king.position.row,
      col: targetCol,
    },
    promotion: null,
  }
}

function resolveStandardMove(state: MoveEngineState, san: string) {
  const parsed = SAN_MOVE_REGEX.exec(san)

  if (!parsed?.groups) {
    throw new Error(`Unsupported SAN token: ${san}`)
  }

  const pieceType = parsePieceType(parsed.groups.piece)
  const toCol = fileToCol(parsed.groups.toFile)
  const toRow = rankToRow(parsed.groups.toRank)

  if (toCol < 0 || toRow < 0 || toRow > 7) {
    throw new Error(`Invalid target square in SAN token: ${san}`)
  }

  const target = { row: toRow, col: toCol }
  const requiresCapture = parsed.groups.capture === 'x'
  const fromFile = parsed.groups.fromFile || null
  const fromRank = parsed.groups.fromRank || null
  const promotion = parsePromotionType(parsed.groups.promotion as PromotionCode | undefined)

  const candidates = state.pieceStates
    .filter(piece => piece.color === state.currentTurn && piece.type === pieceType)
    .filter((piece) => {
      if (fromFile && piece.position.col !== fileToCol(fromFile)) {
        return false
      }

      if (fromRank && piece.position.row !== rankToRow(fromRank)) {
        return false
      }

      const legalMoves = getLegalMovesForPiece(piece, state.pieceStates, {
        castling: { movedPieceIds: state.movedPieceIds },
        enPassant: state.enPassant,
      })

      return legalMoves.some(move => toCoordinateKey(move) === toCoordinateKey(target))
    })
    .filter(piece => !requiresCapture || isCaptureMove(state, piece, target))

  if (candidates.length !== 1) {
    throw new Error(`Could not resolve unique move for SAN token: ${san}`)
  }

  return {
    pieceId: candidates[0].id,
    target,
    promotion,
  }
}

function applyPromotionIfNeeded(state: MoveEngineState, pieceId: string, promotion: PieceType | null) {
  if (!promotion) {
    return state
  }

  const promotedPiece = state.pieceStates.find(piece => piece.id === pieceId)

  if (!promotedPiece || promotedPiece.type !== PieceType.PAWN) {
    return state
  }

  const updatedPieces = state.pieceStates.map((piece) => {
    if (piece.id !== pieceId) {
      return piece
    }

    return {
      ...piece,
      type: promotion,
      textureKey: getPieceTextureKey(piece.color, promotion),
    }
  })

  return {
    ...state,
    pieceStates: updatedPieces,
  }
}

function importPgn(pgn: string): PgnImportResult {
  const headers = parseHeaders(pgn)
  const tokens = extractMoveTokens(pgn)
  const sanMoves: string[] = []

  if (headers.FEN) {
    throw new Error('PGN import with custom FEN is not supported yet')
  }

  let resultToken: string | null = null
  let state: MoveEngineState = {
    pieceStates: createInitialPieces(),
    movedPieceIds: new Set<string>(),
    enPassant: null,
    currentTurn: PieceColor.WHITE,
  }

  for (const token of tokens) {
    if (RESULTS.has(token)) {
      resultToken = token
      break
    }

    const san = normalizeSanToken(token)

    if (!san) {
      continue
    }

    const castleMove = resolveCastlingMove(state, san)
    const resolved = castleMove ?? resolveStandardMove(state, san)
    const moveResult = applyMove(state, {
      pieceId: resolved.pieceId,
      target: resolved.target,
    })

    if (!moveResult) {
      throw new Error(`Illegal move in PGN: ${san}`)
    }

    state = applyPromotionIfNeeded({
      pieceStates: moveResult.pieceStates,
      movedPieceIds: moveResult.movedPieceIds,
      enPassant: moveResult.enPassant,
      currentTurn: moveResult.currentTurn,
    }, resolved.pieceId, resolved.promotion)

    sanMoves.push(san)
  }

  return {
    headers,
    moves: sanMoves,
    result: resultToken,
    state,
  }
}

function chunkMovesByTurn(moves: string[]) {
  const chunks: string[] = []

  for (let index = 0; index < moves.length; index += 2) {
    const whiteMove = moves[index]
    const blackMove = moves[index + 1]
    const moveNumber = Math.floor(index / 2) + 1

    if (blackMove) {
      chunks.push(`${moveNumber}. ${whiteMove} ${blackMove}`)
      continue
    }

    chunks.push(`${moveNumber}. ${whiteMove}`)
  }

  return chunks
}

function exportPgn({ headers = {}, moves, result = '*' }: PgnExportOptions) {
  const headerLines = Object.entries(headers)
    .map(([key, value]) => `[${key} "${value}"]`)
  const moveText = chunkMovesByTurn(moves).join(' ')

  if (headerLines.length === 0) {
    return `${moveText} ${result}`.trim()
  }

  return `${headerLines.join('\n')}\n\n${`${moveText} ${result}`.trim()}`
}

function createEmptyPgnHeaders() {
  return {
    Event: 'PixChess Game',
    Site: 'Local',
    Date: '????.??.??',
    Round: '-',
    White: 'White Player',
    Black: 'Black Player',
    Result: '*',
  }
}

export {
  createEmptyPgnHeaders,
  exportPgn,
  importPgn,
  type PgnExportOptions,
  type PgnImportResult,
}
