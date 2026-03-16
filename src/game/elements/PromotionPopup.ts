import type { GameObjects, Scene } from 'phaser'
import type { PieceTextureKey } from '@/game/types'
import { COLORS } from '@/config/ui'
import { Piece } from '@/game/elements/Piece'
import {
  PieceColor,
  PieceTextureKey as PieceTextureKeyValue,
  PieceType,
} from '@/game/types'

const PROMOTION_OPTIONS: PieceType[] = [
  PieceType.QUEEN,
  PieceType.ROOK,
  PieceType.BISHOP,
  PieceType.KNIGHT,
]

interface PromotionPopupOptions {
  color: PieceColor
  onSelect: (pieceType: PieceType) => void
}

function getTextureKeyForPiece(color: PieceColor, type: PieceType): PieceTextureKey {
  if (color === PieceColor.BLACK) {
    if (type === PieceType.BISHOP) {
      return PieceTextureKeyValue.BLACK_BISHOP
    }

    if (type === PieceType.KING) {
      return PieceTextureKeyValue.BLACK_KING
    }

    if (type === PieceType.KNIGHT) {
      return PieceTextureKeyValue.BLACK_KNIGHT
    }

    if (type === PieceType.PAWN) {
      return PieceTextureKeyValue.BLACK_PAWN
    }

    if (type === PieceType.QUEEN) {
      return PieceTextureKeyValue.BLACK_QUEEN
    }

    return PieceTextureKeyValue.BLACK_ROOK
  }

  if (type === PieceType.BISHOP) {
    return PieceTextureKeyValue.WHITE_BISHOP
  }

  if (type === PieceType.KING) {
    return PieceTextureKeyValue.WHITE_KING
  }

  if (type === PieceType.KNIGHT) {
    return PieceTextureKeyValue.WHITE_KNIGHT
  }

  if (type === PieceType.PAWN) {
    return PieceTextureKeyValue.WHITE_PAWN
  }

  if (type === PieceType.QUEEN) {
    return PieceTextureKeyValue.WHITE_QUEEN
  }

  return PieceTextureKeyValue.WHITE_ROOK
}

export class PromotionPopup {
  private scene: Scene
  private container: GameObjects.Container

  constructor(scene: Scene, options: PromotionPopupOptions) {
    this.scene = scene

    const centerX = this.scene.cameras.main.centerX
    const centerY = this.scene.cameras.main.centerY

    const backdrop = this.scene.add.rectangle(
      centerX,
      centerY,
      this.scene.scale.width,
      this.scene.scale.height,
      COLORS.promotionPopup.backdrop,
      0.30,
    )
    backdrop.setInteractive()
    backdrop.setDepth(200)

    const panelWidth = 340
    const panelHeight = 140
    const panel = this.scene.add.rectangle(
      centerX,
      centerY,
      panelWidth,
      panelHeight,
      COLORS.promotionPopup.panel.background,
      0.95,
    )
    panel.setStrokeStyle(2, COLORS.promotionPopup.panel.stroke, 1)
    panel.setDepth(201)

    const title = this.scene.add.text(centerX, centerY - 44, 'Choose Promotion', {
      fontFamily: 'primary',
      fontSize: 24,
      color: COLORS.promotionPopup.title.text,
    })
    title.setOrigin(0.5)
    title.setDepth(202)

    const optionSpacing = 72
    const startX = centerX - (optionSpacing * (PROMOTION_OPTIONS.length - 1)) / 2
    const optionY = centerY + 10
    const optionSprites: Piece[] = []

    for (let index = 0; index < PROMOTION_OPTIONS.length; index += 1) {
      const type = PROMOTION_OPTIONS[index]
      const textureKey = getTextureKeyForPiece(options.color, type)
      const x = startX + index * optionSpacing
      const optionSprite = new Piece(this.scene, x, optionY, textureKey, `promotion-${type}`)
      optionSprite.setDepth(202)
      optionSprite.fitToCell(56, 8)
      optionSprite.setInteractive({ useHandCursor: true })
      optionSprite.on('pointerdown', () => {
        options.onSelect(type)
      })
      optionSprites.push(optionSprite)
    }

    this.container = this.scene.add.container(0, 0, [
      backdrop,
      panel,
      title,
      ...optionSprites,
    ])
    this.container.setDepth(200)
  }

  destroy() {
    this.container.destroy(true)
  }
}

export {
  getTextureKeyForPiece,
}
