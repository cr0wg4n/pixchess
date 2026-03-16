import type {
  CheckStatus,
  EnPassantState,
  MoveGenerationContext,
} from '@/game/domain/pieceMoves'
import type { ChessBoardSceneData } from '@/game/helpers/chessboardSession'
import type { PieceState } from '@/game/types'
import {
  Scene,
} from 'phaser'
import {
} from '@/config/chessEffects'
import { COLORS } from '@/config/ui'
import { ChessClock } from '@/game/domain/chessClock'
import { applyMove } from '@/game/domain/moveEngine'
import {
  getCheckStatus,
} from '@/game/domain/pieceMoves'
import { getPieceValue } from '@/game/domain/pieceValues'
import { ChessboardEffectsController } from '@/game/effects/ChessboardEffectsController'
import { BoardSquare } from '@/game/elements/BoardSquare'
import { Piece } from '@/game/elements/Piece'
import { PlayerProfile } from '@/game/elements/PlayerProfile'
import {
  getTextureKeyForPiece,
  PromotionPopup,
} from '@/game/elements/PromotionPopup'
import {
  ChessboardInteractionController,
} from '@/game/helpers/ChessboardInteractionController'
import {
  loadChessBoardGameState,
  resolveChessBoardSceneData,
} from '@/game/helpers/chessboardSession'
import { buildAnnotatedSan, buildSanBase } from '@/game/helpers/chessNotation'
import {
  exportPgn,
} from '@/game/helpers/pgn'
import {
  PieceColor,
  PieceType,
} from '@/game/types'

const BOARD_SIZE = 8
const TILE_SIZE = 60
const PROFILE_MARGIN = 50

export class ChessBoard extends Scene {
  squares: BoardSquare[][] = []
  pieces: Piece[] = []
  pieceStates: PieceState[] = []
  whiteAtBottom = true
  movedPieceIds = new Set<string>()
  enPassant: EnPassantState | null = null
  currentTurn: PieceColor = PieceColor.WHITE
  checkStatus: CheckStatus = {
    inCheck: false,
    isCheckmate: false,
    kingPosition: null,
  }

  isGameFinished = false
  isAwaitingPromotion = false
  promotionPopup: PromotionPopup | null = null
  whiteProfile: PlayerProfile | null = null
  blackProfile: PlayerProfile | null = null
  whiteCapturedPoints = 0
  blackCapturedPoints = 0
  preloadPgn: string | null = null
  pgnHeaders: Record<string, string> = {}
  pgnMoves: string[] = []
  pgnResult = '*'
  pendingPromotionSan: string | null = null
  gameMinutes = 10
  incrementSeconds = 0
  whitePlayerName = 'White Player'
  blackPlayerName = 'Black Player'
  clock: ChessClock | null = null
  clockTickEvent: Phaser.Time.TimerEvent | null = null
  boardEffects: ChessboardEffectsController | null = null
  interactionController: ChessboardInteractionController | null = null
  lastClockTickAt = 0

  constructor() {
    super('ChessBoard')
  }

  init(data: ChessBoardSceneData = {}) {
    const sceneData = resolveChessBoardSceneData(data)

    this.preloadPgn = sceneData.preloadPgn
    this.gameMinutes = sceneData.gameMinutes
    this.incrementSeconds = sceneData.incrementSeconds
    this.whitePlayerName = sceneData.whitePlayerName
    this.blackPlayerName = sceneData.blackPlayerName
    this.clock = new ChessClock({
      gameMinutes: this.gameMinutes,
      incrementSeconds: this.incrementSeconds,
      activeColor: this.currentTurn,
    })
    this.lastClockTickAt = 0
  }

  create() {
    this.events.once('shutdown', () => {
      this.closePromotionPopup()
      this.boardEffects?.destroy()
      this.boardEffects = null
      this.interactionController?.destroy()
      this.interactionController = null
      this.clock = null
      this.clockTickEvent?.remove()
      this.clockTickEvent = null
    })

    const boardMetrics = this.getBoardMetrics()

    this.squares = this.createBoardRectangles(
      boardMetrics.offsetX,
      boardMetrics.offsetY,
    )
    this.interactionController = new ChessboardInteractionController(this, this.squares, TILE_SIZE)
    this.boardEffects = new ChessboardEffectsController(this, {
      getBoardMetrics: () => this.getBoardMetrics(),
      getViewRow: row => this.getViewRow(row),
      tileSize: TILE_SIZE,
    })

    const { error, gameState } = loadChessBoardGameState(this.preloadPgn)

    if (error) {
      console.error('Failed to import PGN. Falling back to initial position.', error)
    }

    this.pieceStates = gameState.pieceStates
    this.movedPieceIds = gameState.movedPieceIds
    this.enPassant = gameState.enPassant
    this.currentTurn = gameState.currentTurn
    this.pgnHeaders = gameState.pgnHeaders
    this.pgnMoves = gameState.pgnMoves
    this.pgnResult = gameState.pgnResult
    this.clock?.setActiveColor(this.currentTurn)

    this.pieces = this.createPieceSprites(
      this.pieceStates,
      boardMetrics.offsetX,
      boardMetrics.offsetY,
    )
    this.createPlayerProfiles(boardMetrics.offsetX, boardMetrics.offsetY)
    this.startChessClock()

    this.bindBoardInteractions()
    this.bindPieceInteractions()
    this.refreshCheckStatus()
  }

  startChessClock() {
    this.updateClockDisplays()
    this.lastClockTickAt = this.time.now
    this.clockTickEvent?.remove()
    this.clockTickEvent = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        this.tickChessClock()
      },
    })
  }

  tickChessClock() {
    if (!this.clock) {
      return
    }

    if (this.isGameFinished || this.isAwaitingPromotion) {
      this.lastClockTickAt = this.time.now
      return
    }

    const now = this.time.now
    const deltaMs = Math.max(0, now - this.lastClockTickAt)

    this.lastClockTickAt = now
    const loser = this.clock.tick(deltaMs)

    if (loser) {
      this.updateClockDisplays()
      this.endGameByTimeout(loser)
      return
    }

    this.updateClockDisplays()
  }

  updateClockDisplays() {
    if (!this.clock) {
      return
    }

    this.whiteProfile?.setClock(this.clock.getRemaining(PieceColor.WHITE), this.currentTurn === PieceColor.WHITE && !this.isGameFinished)
    this.blackProfile?.setClock(this.clock.getRemaining(PieceColor.BLACK), this.currentTurn === PieceColor.BLACK && !this.isGameFinished)
  }

  getInteractionState() {
    return {
      checkStatus: this.checkStatus,
      currentTurn: this.currentTurn,
      enPassant: this.enPassant,
      isAwaitingPromotion: this.isAwaitingPromotion,
      isGameFinished: this.isGameFinished,
      movedPieceIds: this.movedPieceIds,
      pieceStates: this.pieceStates,
    }
  }

  getViewRow(boardRow: number) {
    return this.whiteAtBottom
      ? boardRow
      : BOARD_SIZE - 1 - boardRow
  }

  randomizeBoardPerspective() {
    this.whiteAtBottom = Math.random() < 0.5
  }

  getBoardMetrics() {
    const size = BOARD_SIZE * TILE_SIZE

    return {
      size,
      offsetX: (this.scale.width - size) / 2,
      offsetY: (this.scale.height - size) / 2,
    }
  }

  createPlayerProfiles(offsetX: number, offsetY: number) {
    const boardSize = BOARD_SIZE * TILE_SIZE
    const centerX = offsetX + boardSize / 2
    const topY = offsetY - PROFILE_MARGIN
    const bottomY = offsetY + boardSize + PROFILE_MARGIN
    const whiteY = this.whiteAtBottom ? bottomY : topY
    const blackY = this.whiteAtBottom ? topY : bottomY
    const whiteAvatarSide = this.whiteAtBottom ? 'left' : 'right'
    const blackAvatarSide = this.whiteAtBottom ? 'right' : 'left'

    this.whiteProfile = new PlayerProfile(this, centerX, whiteY, {
      avatarSide: whiteAvatarSide,
      color: PieceColor.WHITE,
      name: this.whitePlayerName,
    })

    this.blackProfile = new PlayerProfile(this, centerX, blackY, {
      avatarSide: blackAvatarSide,
      color: PieceColor.BLACK,
      name: this.blackPlayerName,
    })
  }

  createBoardRectangles(offsetX: number, offsetY: number) {
    const lightColor = COLORS.chessboard.light
    const darkColor = COLORS.chessboard.dark
    this.randomizeBoardPerspective()

    const board: BoardSquare[][] = []

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      const boardRow: BoardSquare[] = []

      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const isLight = (row + col) % 2 === 0
        const x = offsetX + col * TILE_SIZE
        const y = offsetY + this.getViewRow(row) * TILE_SIZE
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
      const y = offsetY + this.getViewRow(pieceState.position.row) * TILE_SIZE + TILE_SIZE / 2

      const piece = new Piece(this, x, y, pieceState.textureKey, pieceState.id)
      piece.fitToCell(TILE_SIZE, 10)
      piece.setInteractive({ useHandCursor: true })

      return piece
    })
  }

  bindBoardInteractions() {
    for (const row of this.squares) {
      for (const square of row) {
        square.on('pointerover', () => {
          this.interactionController?.handleSquareHover(square.row, square.col, this.getInteractionState())
        })
        square.on('pointerout', () => {
          this.interactionController?.clearHoverPreview(this.getInteractionState())
        })
        square.on('pointerdown', () => {
          this.interactionController?.handleSquareSelection(square.row, square.col, this.getInteractionState(), {
            moveSelectedPieceTo: (row, col) => {
              this.moveSelectedPieceTo(row, col)
            },
          })
        })
      }
    }
  }

  bindPieceInteractions() {
    for (const piece of this.pieces) {
      piece.on('pointerover', () => {
        this.interactionController?.setSquareHoverForPiece(piece.identifier, true, this.getInteractionState())
        this.interactionController?.handlePieceHover(piece.identifier, this.getInteractionState())
      })
      piece.on('pointerout', () => {
        this.interactionController?.setSquareHoverForPiece(piece.identifier, false, this.getInteractionState())
        this.interactionController?.clearHoverPreview(this.getInteractionState())
      })
      piece.on('pointerdown', () => {
        this.interactionController?.handlePieceSelection(piece.identifier, this.getInteractionState(), {
          moveSelectedPieceTo: (row, col) => {
            this.moveSelectedPieceTo(row, col)
          },
        })
      })
    }
  }

  moveSelectedPieceTo(row: number, col: number) {
    if (this.isGameFinished || this.isAwaitingPromotion) {
      return
    }

    const selectedPieceId = this.interactionController?.getSelectedPieceId() ?? null

    if (!selectedPieceId) {
      return
    }

    const stateBeforeMove = {
      pieceStates: this.pieceStates,
      movedPieceIds: this.movedPieceIds,
      enPassant: this.enPassant,
      currentTurn: this.currentTurn,
    }
    const movingColor = this.currentTurn

    const moveResult = applyMove({
      pieceStates: this.pieceStates,
      movedPieceIds: this.movedPieceIds,
      enPassant: this.enPassant,
      currentTurn: this.currentTurn,
    }, {
      pieceId: selectedPieceId,
      target: { row, col },
    })

    if (!moveResult) {
      this.interactionController?.clearSelection(this.getInteractionState())
      return
    }

    for (const capturedPieceId of moveResult.capturedPieceIds) {
      this.removePieceSprite(capturedPieceId)
    }

    this.pieceStates = moveResult.pieceStates
    this.movedPieceIds = moveResult.movedPieceIds
    this.enPassant = moveResult.enPassant
    this.interactionController?.setLastMove(moveResult.movedPiece.from, moveResult.movedPiece.to)
    this.clock?.completeMove(movingColor, moveResult.currentTurn)
    this.currentTurn = moveResult.currentTurn
    this.lastClockTickAt = this.time.now
    this.updateClockDisplays()
    this.refreshCheckStatus()

    const sanBase = buildSanBase(stateBeforeMove, moveResult)

    if (this.checkStatus.isCheckmate) {
      this.appendSanMove(sanBase)
      this.endGameByCheckmate()
      return
    }

    this.tweenPieceTo(moveResult.movedPiece.pieceId, moveResult.movedPiece.to.row, moveResult.movedPiece.to.col)

    if (moveResult.rookMove) {
      this.tweenPieceTo(moveResult.rookMove.pieceId, moveResult.rookMove.to.row, moveResult.rookMove.to.col)
    }

    const promotionPiece = this.getPromotablePawn(moveResult.movedPiece.pieceId)

    if (promotionPiece) {
      this.isAwaitingPromotion = true
      this.pendingPromotionSan = sanBase
      this.openPromotionPopup(promotionPiece.id, promotionPiece.color)
      this.interactionController?.clearSelection(this.getInteractionState())
      return
    }

    this.appendSanMove(sanBase)

    this.interactionController?.clearSelection(this.getInteractionState())
  }

  getPromotablePawn(pieceId: string) {
    const piece = this.getPieceStateById(pieceId)

    if (!piece || piece.type !== PieceType.PAWN) {
      return null
    }

    const promotionRow = piece.color === PieceColor.WHITE ? 0 : BOARD_SIZE - 1

    if (piece.position.row !== promotionRow) {
      return null
    }

    return piece
  }

  openPromotionPopup(pieceId: string, color: PieceColor) {
    this.closePromotionPopup()

    this.promotionPopup = new PromotionPopup(this, {
      color,
      onSelect: (type) => {
        this.promotePawn(pieceId, type)
      },
    })
  }

  closePromotionPopup() {
    this.promotionPopup?.destroy()
    this.promotionPopup = null
  }

  promotePawn(pieceId: string, newType: PieceType) {
    const pieceState = this.getPieceStateById(pieceId)
    const pieceSprite = this.getPieceSpriteById(pieceId)

    if (!pieceState || !pieceSprite) {
      this.isAwaitingPromotion = false
      this.closePromotionPopup()
      return
    }

    const newTextureKey = getTextureKeyForPiece(pieceState.color, newType)
    pieceState.type = newType
    pieceState.textureKey = newTextureKey

    pieceSprite.setTexture(newTextureKey)
    pieceSprite.textureKey = newTextureKey
    pieceSprite.fitToCell(TILE_SIZE, 10)

    this.isAwaitingPromotion = false
    this.closePromotionPopup()
    this.refreshCheckStatus()
    this.appendSanMove(this.pendingPromotionSan, newType)
    this.pendingPromotionSan = null

    if (this.checkStatus.isCheckmate) {
      this.endGameByCheckmate()
    }
  }

  endGameByCheckmate() {
    this.isGameFinished = true
    this.clockTickEvent?.remove()
    this.clockTickEvent = null
    this.pgnResult = this.currentTurn === PieceColor.WHITE ? '0-1' : '1-0'
    this.updateClockDisplays()

    const winnerMessage = this.currentTurn === PieceColor.WHITE
      ? 'Black Wins!'
      : 'White Wins!'

    this.scene.start('GameOver', {
      message: winnerMessage,
    })
  }

  endGameByTimeout(loser: PieceColor) {
    if (this.isGameFinished) {
      return
    }

    this.isGameFinished = true
    this.clockTickEvent?.remove()
    this.clockTickEvent = null
    this.pgnResult = loser === PieceColor.WHITE ? '0-1' : '1-0'
    this.updateClockDisplays()

    const winnerMessage = loser === PieceColor.WHITE
      ? 'Black Wins on Time!'
      : 'White Wins on Time!'

    this.scene.start('GameOver', {
      message: winnerMessage,
    })
  }

  removePieceSprite(pieceId: string) {
    const capturedPieceState = this.getPieceStateById(pieceId)

    const spriteIndex = this.pieces.findIndex(piece => piece.identifier === pieceId)

    if (spriteIndex >= 0) {
      const [pieceSprite] = this.pieces.splice(spriteIndex, 1)

      if (capturedPieceState) {
        this.registerCapture(capturedPieceState)
      }

      this.boardEffects?.playCaptureEffect(pieceSprite.x, pieceSprite.y, capturedPieceState?.color, capturedPieceState?.type)
      pieceSprite.destroy()
    }
  }

  registerCapture(capturedPieceState: PieceState) {
    const capturerProfile = this.currentTurn === PieceColor.WHITE
      ? this.whiteProfile
      : this.blackProfile
    const capturedPieceValue = getPieceValue(capturedPieceState.type)

    capturerProfile?.addCapturedPiece(capturedPieceState.textureKey)

    if (this.currentTurn === PieceColor.WHITE) {
      this.whiteCapturedPoints += capturedPieceValue
    }
    else {
      this.blackCapturedPoints += capturedPieceValue
    }

    this.refreshPointsAdvantage()
  }

  refreshPointsAdvantage() {
    const whiteAdvantage = this.whiteCapturedPoints - this.blackCapturedPoints
    const blackAdvantage = this.blackCapturedPoints - this.whiteCapturedPoints

    this.whiteProfile?.setAdvantage(Math.max(whiteAdvantage, 0))
    this.blackProfile?.setAdvantage(Math.max(blackAdvantage, 0))
  }

  tweenPieceTo(pieceId: string, row: number, col: number) {
    const pieceSprite = this.getPieceSpriteById(pieceId)
    const pieceState = this.getPieceStateById(pieceId)

    if (!pieceSprite || !pieceState) {
      return
    }
    this.boardEffects?.tweenPieceTo(pieceSprite, pieceState.color, row, col)
  }

  getPieceStateById(pieceId: string) {
    return this.pieceStates.find(piece => piece.id === pieceId)
  }

  getPieceSpriteById(pieceId: string) {
    return this.pieces.find(piece => piece.identifier === pieceId)
  }

  getMoveContext(): MoveGenerationContext {
    return {
      castling: {
        movedPieceIds: this.movedPieceIds,
      },
      enPassant: this.enPassant,
    }
  }

  refreshCheckStatus() {
    this.checkStatus = getCheckStatus(this.currentTurn, this.pieceStates, this.getMoveContext())

    // Check highlight should update immediately after game state transitions.
    this.interactionController?.refreshHighlights(this.getInteractionState())
  }

  appendSanMove(baseSan: string | null, promotionType?: PieceType) {
    const annotatedSan = buildAnnotatedSan(baseSan, this.checkStatus, promotionType)

    if (!annotatedSan) {
      return
    }

    this.pgnMoves.push(annotatedSan)
    this.pgnResult = '*'
  }

  getExportablePgn() {
    const headers = {
      ...this.pgnHeaders,
      Result: this.pgnResult,
    }

    return exportPgn({
      headers,
      moves: this.pgnMoves,
      result: this.pgnResult,
    })
  }
}
