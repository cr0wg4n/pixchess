import type {
  CheckStatus,
  EnPassantState,
  MoveGenerationContext,
} from '@/game/domain/pieceMoves'
import type { PieceState } from '@/game/types'
import {
  Scene,
} from 'phaser'
import {
  CHESS_CAPTURE_EFFECTS,
  CHESS_HIGHLIGHTS,
  CHESS_MOVE_EFFECTS,
} from '@/config/chessEffects'
import { COLORS } from '@/config/ui'
import { ChessClock } from '@/game/domain/chessClock'
import { createInitialPieces } from '@/game/domain/chessSetup'
import { applyMove } from '@/game/domain/moveEngine'
import {
  getCheckStatus,
  getLegalMovesForPiece,
} from '@/game/domain/pieceMoves'
import { getPieceValue } from '@/game/domain/pieceValues'
import { ShadowBehavior } from '@/game/effects/ShadowBehavior'
import { VisualEffectsManager } from '@/game/effects/VisualEffectsManager'
import { BoardSquare } from '@/game/elements/BoardSquare'
import { Piece } from '@/game/elements/Piece'
import { PlayerProfile } from '@/game/elements/PlayerProfile'
import {
  getTextureKeyForPiece,
  PromotionPopup,
} from '@/game/elements/PromotionPopup'
import {
  createEmptyPgnHeaders,
  exportPgn,
  importPgn,
} from '@/game/helpers/pgn'
import {
  PieceColor,
  PieceType,
} from '@/game/types'

const BOARD_SIZE = 8
const TILE_SIZE = 60
const PROFILE_MARGIN = 50
const WHITE_PLAYER_NAME = 'White Player'
const BLACK_PLAYER_NAME = 'Black Player'
const FILES = 'abcdefgh'

interface ChessBoardSceneData {
  pgn?: string
  gameMinutes?: number
  incrementSeconds?: number
  whitePlayer?: string
  blackPlayer?: string
}

export class ChessBoard extends Scene {
  squares: BoardSquare[][] = []
  pieces: Piece[] = []
  pieceStates: PieceState[] = []
  whiteAtBottom = true
  selectedPieceId: string | null = null
  legalTargets = new Set<string>()
  legalCaptureTargets = new Set<string>()
  hoverTargets = new Set<string>()
  hoverCaptureTargets = new Set<string>()
  lastMoveFromKey: string | null = null
  lastMoveToKey: string | null = null
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
  validMoveIndicators: Phaser.GameObjects.Arc[] = []
  cameraRotationDriver = { angle: 0 }
  cameraRotationTween: Phaser.Tweens.Tween | null = null
  preloadPgn: string | null = null
  pgnHeaders: Record<string, string> = createEmptyPgnHeaders()
  pgnMoves: string[] = []
  pgnResult = '*'
  pendingPromotionSan: string | null = null
  gameMinutes = 10
  incrementSeconds = 0
  whitePlayerName = WHITE_PLAYER_NAME
  blackPlayerName = BLACK_PLAYER_NAME
  clock: ChessClock | null = null
  clockTickEvent: Phaser.Time.TimerEvent | null = null
  lastClockTickAt = 0

  effects!: VisualEffectsManager

  constructor() {
    super('ChessBoard')
  }

  init(data: ChessBoardSceneData = {}) {
    this.preloadPgn = typeof data.pgn === 'string' ? data.pgn : null
    this.gameMinutes = Number.isFinite(data.gameMinutes)
      ? Math.max(1, Math.floor(Number(data.gameMinutes)))
      : 10
    this.incrementSeconds = Number.isFinite(data.incrementSeconds)
      ? Math.max(0, Math.floor(Number(data.incrementSeconds)))
      : 0
    this.whitePlayerName = typeof data.whitePlayer === 'string' && data.whitePlayer.trim().length > 0
      ? data.whitePlayer.trim()
      : WHITE_PLAYER_NAME
    this.blackPlayerName = typeof data.blackPlayer === 'string' && data.blackPlayer.trim().length > 0
      ? data.blackPlayer.trim()
      : BLACK_PLAYER_NAME
    this.clock = new ChessClock({
      gameMinutes: this.gameMinutes,
      incrementSeconds: this.incrementSeconds,
      activeColor: this.currentTurn,
    })
    this.lastClockTickAt = 0
  }

  create() {
    this.effects = new VisualEffectsManager(this)
    this.events.once('shutdown', () => {
      this.closePromotionPopup()
      this.effects.destroy()
      this.clock = null
      this.clockTickEvent?.remove()
      this.clockTickEvent = null
      this.cameraRotationTween?.stop()
      this.cameraRotationTween = null
      const camera = this.cameras?.main

      if (camera) {
        camera.setAngle(0)
      }

      for (const indicator of this.validMoveIndicators) {
        indicator.destroy()
      }
      this.validMoveIndicators = []
    })

    const boardMetrics = this.getBoardMetrics()

    this.squares = this.createBoardRectangles(
      boardMetrics.offsetX,
      boardMetrics.offsetY,
    )

    if (this.preloadPgn) {
      try {
        const imported = importPgn(this.preloadPgn)

        this.pieceStates = imported.state.pieceStates
        this.movedPieceIds = new Set(imported.state.movedPieceIds)
        this.enPassant = imported.state.enPassant
        this.currentTurn = imported.state.currentTurn
        this.pgnHeaders = {
          ...createEmptyPgnHeaders(),
          ...imported.headers,
        }
        this.pgnMoves = [...imported.moves]
        this.pgnResult = imported.result ?? '*'
        this.clock?.setActiveColor(this.currentTurn)
      }
      catch (error) {
        console.error('Failed to import PGN. Falling back to initial position.', error)
        this.pieceStates = createInitialPieces()
        this.movedPieceIds = new Set<string>()
        this.enPassant = null
        this.currentTurn = PieceColor.WHITE
        this.pgnHeaders = createEmptyPgnHeaders()
        this.pgnMoves = []
        this.pgnResult = '*'
        this.clock?.setActiveColor(this.currentTurn)
      }
    }
    else {
      this.pieceStates = createInitialPieces()
      this.movedPieceIds = new Set<string>()
      this.enPassant = null
      this.currentTurn = PieceColor.WHITE
      this.pgnHeaders = createEmptyPgnHeaders()
      this.pgnMoves = []
      this.pgnResult = '*'
      this.clock?.setActiveColor(this.currentTurn)
    }

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
      this.effects.addEffect(piece, new ShadowBehavior(this, {
        alpha: pieceState.color === PieceColor.WHITE ? 0.20 : 0.15,
      }))

      return piece
    })
  }

  bindBoardInteractions() {
    for (const row of this.squares) {
      for (const square of row) {
        square.on('pointerover', () => {
          this.handleSquareHover(square.row, square.col)
        })
        square.on('pointerout', () => {
          this.clearHoverPreview()
        })
        square.on('pointerdown', () => {
          this.handleSquareSelection(square.row, square.col)
        })
      }
    }
  }

  bindPieceInteractions() {
    for (const piece of this.pieces) {
      piece.on('pointerover', () => {
        this.setSquareHoverForPiece(piece.identifier, true)
        this.handlePieceHover(piece.identifier)
      })
      piece.on('pointerout', () => {
        this.setSquareHoverForPiece(piece.identifier, false)
        this.clearHoverPreview()
      })
      piece.on('pointerdown', () => {
        this.handlePieceSelection(piece.identifier)
      })
    }
  }

  handleSquareHover(row: number, col: number) {
    if (this.isGameFinished || this.isAwaitingPromotion) {
      return
    }

    const pieceAtSquare = this.pieceStates.find(piece => (
      piece.position.row === row
      && piece.position.col === col
      && piece.color === this.currentTurn
    ))

    if (!pieceAtSquare) {
      this.clearHoverPreview()
      return
    }

    const legalMoves = getLegalMovesForPiece(pieceAtSquare, this.pieceStates, this.getMoveContext())
    this.hoverTargets = new Set(legalMoves.map(move => this.toCoordinateKey(move.row, move.col)))
    this.hoverCaptureTargets = this.getCaptureTargetKeys(pieceAtSquare, legalMoves)
    this.refreshHighlights()
  }

  handlePieceHover(pieceId: string) {
    if (this.isGameFinished || this.isAwaitingPromotion) {
      return
    }

    const piece = this.getPieceStateById(pieceId)

    if (!piece || piece.color !== this.currentTurn) {
      this.clearHoverPreview()
      return
    }

    const legalMoves = getLegalMovesForPiece(piece, this.pieceStates, this.getMoveContext())
    this.hoverTargets = new Set(legalMoves.map(move => this.toCoordinateKey(move.row, move.col)))
    this.hoverCaptureTargets = this.getCaptureTargetKeys(piece, legalMoves)
    this.refreshHighlights()
  }

  clearHoverPreview() {
    if (this.hoverTargets.size === 0) {
      return
    }

    this.hoverTargets.clear()
    this.hoverCaptureTargets.clear()
    this.refreshHighlights()
  }

  handlePieceSelection(pieceId: string) {
    if (this.isGameFinished || this.isAwaitingPromotion) {
      return
    }

    const piece = this.getPieceStateById(pieceId)

    if (!piece) {
      return
    }

    if (this.selectedPieceId) {
      if (this.selectedPieceId === pieceId) {
        this.clearSelection()
        return
      }

      const key = this.toCoordinateKey(piece.position.row, piece.position.col)

      if (this.legalTargets.has(key)) {
        this.moveSelectedPieceTo(piece.position.row, piece.position.col)
        return
      }

      if (piece.color !== this.currentTurn) {
        this.clearSelection()
        return
      }
    }

    if (piece.color !== this.currentTurn) {
      return
    }

    if (this.selectedPieceId === pieceId) {
      this.clearSelection()
      return
    }

    const legalMoves = getLegalMovesForPiece(piece, this.pieceStates, this.getMoveContext())

    this.selectedPieceId = pieceId
    this.legalTargets = new Set(legalMoves.map(move => this.toCoordinateKey(move.row, move.col)))
    this.legalCaptureTargets = this.getCaptureTargetKeys(piece, legalMoves)
    this.refreshHighlights()
  }

  handleSquareSelection(row: number, col: number) {
    if (this.isGameFinished || this.isAwaitingPromotion) {
      return
    }

    const pieceAtSquare = this.pieceStates.find(piece => (
      piece.position.row === row
      && piece.position.col === col
    ))

    if (!this.selectedPieceId) {
      if (pieceAtSquare) {
        this.handlePieceSelection(pieceAtSquare.id)
      }

      return
    }

    const key = this.toCoordinateKey(row, col)

    if (!this.legalTargets.has(key)) {
      if (pieceAtSquare && pieceAtSquare.color === this.currentTurn) {
        this.handlePieceSelection(pieceAtSquare.id)
        return
      }

      this.clearSelection()
      return
    }

    this.moveSelectedPieceTo(row, col)
  }

  moveSelectedPieceTo(row: number, col: number) {
    if (this.isGameFinished || this.isAwaitingPromotion) {
      return
    }

    const selectedPieceId = this.selectedPieceId

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
      this.clearSelection()
      return
    }

    for (const capturedPieceId of moveResult.capturedPieceIds) {
      this.removePieceSprite(capturedPieceId)
    }

    this.pieceStates = moveResult.pieceStates
    this.movedPieceIds = moveResult.movedPieceIds
    this.enPassant = moveResult.enPassant
    this.lastMoveFromKey = this.toCoordinateKey(moveResult.movedPiece.from.row, moveResult.movedPiece.from.col)
    this.lastMoveToKey = this.toCoordinateKey(moveResult.movedPiece.to.row, moveResult.movedPiece.to.col)
    this.clock?.completeMove(movingColor, moveResult.currentTurn)
    this.currentTurn = moveResult.currentTurn
    this.lastClockTickAt = this.time.now
    this.updateClockDisplays()
    this.refreshCheckStatus()

    const sanBase = this.buildSanBase(stateBeforeMove, moveResult)

    if (this.checkStatus.isCheckmate) {
      this.appendPgnMove(sanBase)
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
      this.clearSelection()
      return
    }

    this.appendPgnMove(sanBase)

    this.clearSelection()
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
    this.appendPgnMove(this.pendingPromotionSan, newType)
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

      this.shakeBoardOnCapture(capturedPieceState?.type)
      this.emitCaptureParticles(pieceSprite.x, pieceSprite.y, capturedPieceState?.color)
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

  shakeBoardOnCapture(capturedPieceType: PieceType = PieceType.PAWN) {
    const camera = this.cameras?.main

    if (!camera) {
      return
    }

    const pieceValue = getPieceValue(capturedPieceType)
    const duration = Math.min(
      CHESS_CAPTURE_EFFECTS.shake.maxDurationMs,
      CHESS_CAPTURE_EFFECTS.shake.baseDurationMs + pieceValue * CHESS_CAPTURE_EFFECTS.shake.durationPerPointMs,
    )
    const intensity = Math.min(
      CHESS_CAPTURE_EFFECTS.shake.maxIntensity,
      CHESS_CAPTURE_EFFECTS.shake.baseIntensity + pieceValue * CHESS_CAPTURE_EFFECTS.shake.intensityPerPoint,
    )

    camera.shake(
      duration,
      intensity,
    )

    const targetRotation = CHESS_CAPTURE_EFFECTS.shake.rotation.baseDegrees
      + pieceValue * CHESS_CAPTURE_EFFECTS.shake.rotation.degreesPerPoint
    const rotationAmount = Math.min(
      CHESS_CAPTURE_EFFECTS.shake.rotation.maxDegrees,
      targetRotation,
    ) * (Math.random() < 0.5 ? -1 : 1)

    this.cameraRotationTween?.stop()
    this.cameraRotationTween = null
    this.cameraRotationDriver.angle = 0
    camera.setAngle(0)
    this.cameraRotationTween = this.tweens.add({
      targets: this.cameraRotationDriver,
      angle: rotationAmount,
      duration: CHESS_CAPTURE_EFFECTS.shake.rotation.tweenDurationMs,
      ease: 'Sine.easeInOut',
      yoyo: true,
      onUpdate: () => {
        const currentCamera = this.cameras?.main

        if (currentCamera) {
          currentCamera.setAngle(this.cameraRotationDriver.angle)
        }
      },
      onComplete: () => {
        const currentCamera = this.cameras?.main

        if (currentCamera) {
          currentCamera.setAngle(0)
        }
        this.cameraRotationDriver.angle = 0
        this.cameraRotationTween = null
      },
    })
  }

  tweenPieceTo(pieceId: string, row: number, col: number) {
    const pieceSprite = this.getPieceSpriteById(pieceId)
    const pieceState = this.getPieceStateById(pieceId)

    if (!pieceSprite || !pieceState) {
      return
    }

    const startX = pieceSprite.x
    const startY = pieceSprite.y
    const boardMetrics = this.getBoardMetrics()
    const x = boardMetrics.offsetX + col * TILE_SIZE + TILE_SIZE / 2
    const y = boardMetrics.offsetY + this.getViewRow(row) * TILE_SIZE + TILE_SIZE / 2
    const distance = Math.hypot(x - startX, y - startY)
    const movedSquares = Math.max(1, Math.round(distance / TILE_SIZE))
    const duration = CHESS_MOVE_EFFECTS.tweenDurationMs

    const stopTail = this.emitMoveTrailParticles(pieceSprite, pieceState.color, x, y, duration)

    this.tweens.add({
      targets: pieceSprite,
      x,
      y,
      duration,
      onComplete: () => {
        stopTail()

        if (distance > 2) {
          this.emitMoveEndBurst(x, y, pieceState.color, movedSquares)
        }
      },
    })
  }

  clearSelection() {
    this.selectedPieceId = null
    this.legalTargets.clear()
    this.legalCaptureTargets.clear()
    this.hoverTargets.clear()
    this.hoverCaptureTargets.clear()
    this.refreshHighlights()
  }

  refreshHighlights() {
    const selectedPiece = this.selectedPieceId
      ? this.getPieceStateById(this.selectedPieceId)
      : null
    const selectedPieceKey = selectedPiece
      ? this.toCoordinateKey(selectedPiece.position.row, selectedPiece.position.col)
      : null
    const checkedKingKey = this.checkStatus.kingPosition && this.checkStatus.inCheck
      ? this.toCoordinateKey(this.checkStatus.kingPosition.row, this.checkStatus.kingPosition.col)
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

        if (this.legalTargets.has(key)) {
          square.clearHighlight()
          continue
        }

        if (this.hoverTargets.has(key)) {
          square.clearHighlight()
          continue
        }

        square.clearHighlight()
      }
    }

    this.refreshValidMoveIndicators()
  }

  refreshValidMoveIndicators() {
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

    const normalRadius = TILE_SIZE * CHESS_HIGHLIGHTS.validMoveCircle.radiusMultiplier
    const captureRadius = TILE_SIZE * CHESS_HIGHLIGHTS.validMoveCircle.captureRadiusMultiplier

    for (const key of validTargets) {
      const [rowRaw, colRaw] = key.split(',')
      const row = Number(rowRaw)
      const col = Number(colRaw)
      const square = this.squares[row]?.[col]

      if (!square) {
        continue
      }

      const isCaptureTarget = captureTargets.has(key)
      const captureStrokeWidth = CHESS_HIGHLIGHTS.validMoveCircle.captureStrokeWidth
      const indicatorRadius = isCaptureTarget ? captureRadius : normalRadius

      const indicator = this.add.circle(
        square.x + TILE_SIZE / 2,
        square.y + TILE_SIZE / 2,
        indicatorRadius,
        CHESS_HIGHLIGHTS.validMoveCircle.fillColor,
        isCaptureTarget ? 0 : CHESS_HIGHLIGHTS.validMoveCircle.fillAlpha,
      )

      if (isCaptureTarget) {
        indicator.setStrokeStyle(
          captureStrokeWidth,
          CHESS_HIGHLIGHTS.validMoveCircle.captureStrokeColor,
          CHESS_HIGHLIGHTS.validMoveCircle.captureStrokeAlpha,
        )
      }

      indicator.setDepth(7)
      this.validMoveIndicators.push(indicator)
    }
  }

  getPieceStateById(pieceId: string) {
    return this.pieceStates.find(piece => piece.id === pieceId)
  }

  getPieceSpriteById(pieceId: string) {
    return this.pieces.find(piece => piece.identifier === pieceId)
  }

  setSquareHoverForPiece(pieceId: string, isHovering: boolean) {
    const piece = this.getPieceStateById(pieceId)

    if (!piece) {
      return
    }

    const square = this.squares[piece.position.row]?.[piece.position.col]

    square?.setHoverState(isHovering)
  }

  getMoveContext(): MoveGenerationContext {
    return {
      castling: {
        movedPieceIds: this.movedPieceIds,
      },
      enPassant: this.enPassant,
    }
  }

  getCaptureTargetKeys(piece: PieceState, legalMoves: Array<{ row: number, col: number }>) {
    const targets = new Set<string>()

    for (const move of legalMoves) {
      const key = this.toCoordinateKey(move.row, move.col)
      const occupant = this.pieceStates.find(candidate => (
        candidate.position.row === move.row
        && candidate.position.col === move.col
      ))

      if (occupant && occupant.color !== piece.color) {
        targets.add(key)
        continue
      }

      if (
        piece.type === PieceType.PAWN
        && this.enPassant
        && this.enPassant.captureSquare.row === move.row
        && this.enPassant.captureSquare.col === move.col
      ) {
        targets.add(key)
      }
    }

    return targets
  }

  refreshCheckStatus() {
    this.checkStatus = getCheckStatus(this.currentTurn, this.pieceStates, this.getMoveContext())

    // Check highlight should update immediately after game state transitions.
    this.refreshHighlights()
  }

  toCoordinateKey(row: number, col: number) {
    return `${row},${col}`
  }

  toAlgebraic(row: number, col: number) {
    const file = FILES[col] ?? 'a'
    const rank = 8 - row

    return `${file}${rank}`
  }

  getPieceLetter(type: PieceType) {
    if (type === PieceType.KING) {
      return 'K'
    }

    if (type === PieceType.QUEEN) {
      return 'Q'
    }

    if (type === PieceType.ROOK) {
      return 'R'
    }

    if (type === PieceType.BISHOP) {
      return 'B'
    }

    if (type === PieceType.KNIGHT) {
      return 'N'
    }

    return ''
  }

  getPromotionCode(type: PieceType | null | undefined) {
    if (type === PieceType.QUEEN) {
      return 'Q'
    }

    if (type === PieceType.ROOK) {
      return 'R'
    }

    if (type === PieceType.BISHOP) {
      return 'B'
    }

    if (type === PieceType.KNIGHT) {
      return 'N'
    }

    return ''
  }

  getDisambiguation(
    piece: PieceState,
    target: { row: number, col: number },
    stateBeforeMove: {
      pieceStates: PieceState[]
      movedPieceIds: ReadonlySet<string>
      enPassant: EnPassantState | null
    },
  ) {
    const competingPieces = stateBeforeMove.pieceStates
      .filter(candidate => (
        candidate.id !== piece.id
        && candidate.color === piece.color
        && candidate.type === piece.type
      ))
      .filter((candidate) => {
        const candidateMoves = getLegalMovesForPiece(candidate, stateBeforeMove.pieceStates, {
          castling: {
            movedPieceIds: stateBeforeMove.movedPieceIds,
          },
          enPassant: stateBeforeMove.enPassant,
        })

        return candidateMoves.some(move => (
          move.row === target.row
          && move.col === target.col
        ))
      })

    if (competingPieces.length === 0) {
      return ''
    }

    const fromFile = FILES[piece.position.col]
    const fromRank = String(8 - piece.position.row)
    const sameFileExists = competingPieces.some(candidate => candidate.position.col === piece.position.col)
    const sameRankExists = competingPieces.some(candidate => candidate.position.row === piece.position.row)

    if (!sameFileExists) {
      return fromFile
    }

    if (!sameRankExists) {
      return fromRank
    }

    return `${fromFile}${fromRank}`
  }

  buildSanBase(
    stateBeforeMove: {
      pieceStates: PieceState[]
      movedPieceIds: ReadonlySet<string>
      enPassant: EnPassantState | null
      currentTurn: PieceColor
    },
    moveResult: {
      movedPiece: {
        pieceId: string
        from: { row: number, col: number }
        to: { row: number, col: number }
      }
      capturedPieceIds: string[]
    },
  ) {
    const movedPieceBefore = stateBeforeMove.pieceStates.find(piece => piece.id === moveResult.movedPiece.pieceId)

    if (!movedPieceBefore) {
      return ''
    }

    const isCastling = (
      movedPieceBefore.type === PieceType.KING
      && moveResult.movedPiece.from.row === moveResult.movedPiece.to.row
      && Math.abs(moveResult.movedPiece.to.col - moveResult.movedPiece.from.col) === 2
    )

    if (isCastling) {
      return moveResult.movedPiece.to.col > moveResult.movedPiece.from.col
        ? 'O-O'
        : 'O-O-O'
    }

    const targetSquare = this.toAlgebraic(moveResult.movedPiece.to.row, moveResult.movedPiece.to.col)
    const isCapture = moveResult.capturedPieceIds.length > 0

    if (movedPieceBefore.type === PieceType.PAWN) {
      const fromFile = FILES[moveResult.movedPiece.from.col]

      if (isCapture) {
        return `${fromFile}x${targetSquare}`
      }

      return targetSquare
    }

    const pieceLetter = this.getPieceLetter(movedPieceBefore.type)
    const disambiguation = this.getDisambiguation(movedPieceBefore, moveResult.movedPiece.to, {
      pieceStates: stateBeforeMove.pieceStates,
      movedPieceIds: stateBeforeMove.movedPieceIds,
      enPassant: stateBeforeMove.enPassant,
    })
    const captureMarker = isCapture ? 'x' : ''

    return `${pieceLetter}${disambiguation}${captureMarker}${targetSquare}`
  }

  appendPgnMove(baseSan: string | null, promotionType?: PieceType) {
    if (!baseSan) {
      return
    }

    const promotionCode = this.getPromotionCode(promotionType)
    const promotionSuffix = promotionCode ? `=${promotionCode}` : ''
    const checkSuffix = this.checkStatus.isCheckmate
      ? '#'
      : this.checkStatus.inCheck
        ? '+'
        : ''

    this.pgnMoves.push(`${baseSan}${promotionSuffix}${checkSuffix}`)
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

  emitCaptureParticles(x: number, y: number, capturedColor?: PieceColor) {
    const particleColor = capturedColor === PieceColor.WHITE
      ? CHESS_CAPTURE_EFFECTS.particles.color.light
      : CHESS_CAPTURE_EFFECTS.particles.color.dark
    const particleCount = CHESS_CAPTURE_EFFECTS.particles.count
    const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)

    for (let index = 0; index < particleCount; index += 1) {
      const spread = TILE_SIZE * CHESS_CAPTURE_EFFECTS.particles.spawnSpreadMultiplier
      const spawnX = x + randomBetween(-spread, spread)
      const spawnY = y + randomBetween(-spread, spread)
      const particleSize = randomBetween(
        CHESS_CAPTURE_EFFECTS.particles.radius.min,
        CHESS_CAPTURE_EFFECTS.particles.radius.max,
      ) * 2
      const particle = this.add.rectangle(
        spawnX,
        spawnY,
        particleSize,
        particleSize,
        particleColor,
        CHESS_CAPTURE_EFFECTS.particles.alpha,
      )
      particle.setDepth(50)

      const angle = randomBetween(0, Math.PI * 2)
      const distance = randomBetween(
        CHESS_CAPTURE_EFFECTS.particles.driftDistance.min,
        CHESS_CAPTURE_EFFECTS.particles.driftDistance.max,
      )
      const targetX = spawnX + Math.cos(angle) * distance
      const targetY = spawnY + Math.sin(angle) * distance

      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0,
        duration: randomBetween(
          CHESS_CAPTURE_EFFECTS.particles.durationMs.min,
          CHESS_CAPTURE_EFFECTS.particles.durationMs.max,
        ),
        ease: 'Cubic.easeOut',
        onComplete: () => {
          particle.destroy()
        },
      })
    }
  }

  emitMoveTrailParticles(
    pieceSprite: Piece,
    pieceColor: PieceColor,
    targetX: number,
    targetY: number,
    duration: number,
  ) {
    const fromX = pieceSprite.x
    const fromY = pieceSprite.y
    const distance = Math.hypot(targetX - fromX, targetY - fromY)

    if (distance < 2) {
      return () => {}
    }

    const particleColor = pieceColor === PieceColor.WHITE
      ? CHESS_MOVE_EFFECTS.trail.color.light
      : CHESS_MOVE_EFFECTS.trail.color.dark
    const movedSquares = Math.max(1, Math.round(distance / TILE_SIZE))
    const intensity = 1 + (movedSquares - 1) * CHESS_MOVE_EFFECTS.trail.intensityPerExtraSquare
    const targetParticlesPerTick = Math.max(
      CHESS_MOVE_EFFECTS.trail.particlesPerTick.min,
      Math.min(
        CHESS_MOVE_EFFECTS.trail.particlesPerTick.max,
        Math.round(
          CHESS_MOVE_EFFECTS.trail.particlesPerTick.min
          + (movedSquares - 1) * CHESS_MOVE_EFFECTS.trail.particlesPerExtraSquare,
        ),
      ),
    )
    const sizeMultiplier = 1 + (movedSquares - 1) * CHESS_MOVE_EFFECTS.trail.sizeMultiplierPerExtraSquare
    const durationMultiplier = 1 + (movedSquares - 1) * CHESS_MOVE_EFFECTS.trail.durationMultiplierPerExtraSquare
    const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)
    const moveAngle = Math.atan2(targetY - fromY, targetX - fromX)
    const tickMs = CHESS_MOVE_EFFECTS.trail.tickMs
    const sparseTargetParticlesPerTick = Math.max(1, Math.round(targetParticlesPerTick * 0.55))
    let tickIndex = 0
    const tailEvent = this.time.addEvent({
      delay: tickMs,
      loop: true,
      callback: () => {
        tickIndex += 1

        const remainingDistance = Math.hypot(targetX - pieceSprite.x, targetY - pieceSprite.y)
        const moveProgress = Math.min(1, Math.max(0, 1 - remainingDistance / distance))
        const progressiveRatio = moveProgress * moveProgress
        const emissionStride = Math.max(2, Math.round(4 - moveProgress * 2))

        if (tickIndex % emissionStride !== 0) {
          return
        }

        const particlesPerTick = Math.max(
          1,
          Math.round(
            1
            + (sparseTargetParticlesPerTick - 1) * progressiveRatio,
          ),
        )

        for (let burstIndex = 0; burstIndex < particlesPerTick; burstIndex += 1) {
          const originX = pieceSprite.x + randomBetween(
            CHESS_MOVE_EFFECTS.trail.spawnJitter.min,
            CHESS_MOVE_EFFECTS.trail.spawnJitter.max,
          )
          const originY = pieceSprite.y + randomBetween(
            CHESS_MOVE_EFFECTS.trail.spawnJitter.min,
            CHESS_MOVE_EFFECTS.trail.spawnJitter.max,
          )
          const spreadAngle = moveAngle + Math.PI + randomBetween(
            CHESS_MOVE_EFFECTS.trail.angleJitter.min,
            CHESS_MOVE_EFFECTS.trail.angleJitter.max,
          )
          const driftDistance = randomBetween(
            CHESS_MOVE_EFFECTS.trail.driftDistance.min,
            CHESS_MOVE_EFFECTS.trail.driftDistance.max,
          ) * intensity
          const endX = originX + Math.cos(spreadAngle) * driftDistance
          const endY = originY + Math.sin(spreadAngle) * driftDistance
          const progressiveSizeMultiplier = 0.4 + progressiveRatio * 1.25
          const particleSize = randomBetween(
            CHESS_MOVE_EFFECTS.trail.radius.min,
            CHESS_MOVE_EFFECTS.trail.radius.max,
          ) * 2 * sizeMultiplier * progressiveSizeMultiplier
          const particle = this.add.rectangle(
            originX,
            originY,
            particleSize,
            particleSize,
            particleColor,
            CHESS_MOVE_EFFECTS.trail.alpha,
          )
          particle.setDepth(CHESS_MOVE_EFFECTS.trail.depth)

          this.tweens.add({
            targets: particle,
            x: endX,
            y: endY,
            alpha: 0,
            scale: 0.25,
            duration: randomBetween(
              CHESS_MOVE_EFFECTS.trail.durationMs.min,
              CHESS_MOVE_EFFECTS.trail.durationMs.max,
            ) * durationMultiplier,
            ease: 'Sine.easeOut',
            onComplete: () => {
              particle.destroy()
            },
          })
        }
      },
    })

    this.time.delayedCall(duration, () => {
      tailEvent.remove()
    })

    return () => {
      tailEvent.remove()
    }
  }

  emitMoveEndBurst(x: number, y: number, pieceColor: PieceColor, movedSquares = 1) {
    const particleColor = pieceColor === PieceColor.WHITE
      ? CHESS_MOVE_EFFECTS.trail.color.light
      : CHESS_MOVE_EFFECTS.trail.color.dark
    const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)
    const burstCount = CHESS_MOVE_EFFECTS.endBurst.count
      + Math.max(0, movedSquares - 1) * CHESS_MOVE_EFFECTS.endBurst.countPerExtraSquare

    for (let index = 0; index < burstCount; index += 1) {
      const angle = randomBetween(0, Math.PI * 2)
      const distance = randomBetween(
        CHESS_MOVE_EFFECTS.endBurst.driftDistance.min,
        CHESS_MOVE_EFFECTS.endBurst.driftDistance.max,
      )
      const targetX = x + Math.cos(angle) * distance
      const targetY = y + Math.sin(angle) * distance
      const particleSize = randomBetween(
        CHESS_MOVE_EFFECTS.endBurst.radius.min,
        CHESS_MOVE_EFFECTS.endBurst.radius.max,
      ) * 2
      const particle = this.add.rectangle(
        x,
        y,
        particleSize,
        particleSize,
        particleColor,
        CHESS_MOVE_EFFECTS.endBurst.alpha,
      )
      particle.setDepth(CHESS_MOVE_EFFECTS.endBurst.depth)

      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0,
        duration: randomBetween(
          CHESS_MOVE_EFFECTS.endBurst.durationMs.min,
          CHESS_MOVE_EFFECTS.endBurst.durationMs.max,
        ),
        ease: 'Sine.easeOut',
        onComplete: () => {
          particle.destroy()
        },
      })
    }
  }
}
