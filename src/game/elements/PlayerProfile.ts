import type { Scene } from 'phaser'
import type { PieceTextureKey } from '@/game/types'
import { GameObjects } from 'phaser'
import { COLORS } from '@/config/ui'
import {
  PieceColor,
} from '@/game/types'

interface PlayerProfileOptions {
  color: PieceColor
  name: string
}

const PROFILE_HEIGHT = 60
const PROFILE_WIDTH = 300
const CAPTURED_ICON_SIZE = 15
const CAPTURED_ICON_SPACING = 15
const ICON_TEXT_GAP = 10
const CAPTURE_ROW_Y = 12

export class PlayerProfile extends GameObjects.Container {
  private panel: GameObjects.Rectangle
  private nameLabel: GameObjects.Text
  private currentPointsLabel: GameObjects.Text
  private capturedIcons: GameObjects.Image[] = []

  constructor(scene: Scene, x: number, y: number, options: PlayerProfileOptions) {
    super(scene, x, y)

    const palette = options.color === PieceColor.WHITE
      ? COLORS.playerProfile.white
      : COLORS.playerProfile.black

    this.panel = scene.add.rectangle(0, 0, PROFILE_WIDTH, PROFILE_HEIGHT, palette.background, 0.95)
    this.panel.setStrokeStyle(2, palette.border, 1)

    this.nameLabel = scene.add.text(0, 0, options.name, {
      fontFamily: 'primary',
      fontSize: 20,
      color: palette.text,
      align: 'center',
    })
    this.nameLabel.setOrigin(0.5)
    this.nameLabel.setY(-15)

    this.currentPointsLabel = scene.add.text(0, CAPTURE_ROW_Y, '', {
      fontFamily: 'primary',
      fontSize: 16,
      color: palette.text,
      align: 'left',
    })
    this.currentPointsLabel.setOrigin(0, 0.5)

    this.add([this.panel, this.nameLabel, this.currentPointsLabel])
    this.setSize(PROFILE_WIDTH, PROFILE_HEIGHT)
    this.setDepth(30)

    scene.add.existing(this)
  }

  setName(name: string) {
    this.nameLabel.setText(name)

    return this
  }

  addCapturedPiece(textureKey: PieceTextureKey) {
    this.addCapturedPieceIcon(textureKey)
    this.layoutCaptureRow()

    return this
  }

  setAdvantage(points: number) {
    if (points <= 0) {
      this.currentPointsLabel.setText('')
      this.layoutCaptureRow()
      return this
    }

    this.currentPointsLabel.setText(`+${points}`)
    this.layoutCaptureRow()

    return this
  }

  private addCapturedPieceIcon(textureKey: PieceTextureKey) {
    const index = this.capturedIcons.length
    const x = -PROFILE_WIDTH / 2 + CAPTURED_ICON_SIZE / 2 + index * CAPTURED_ICON_SPACING
    const y = CAPTURE_ROW_Y
    const icon = this.scene.add.image(x, y, textureKey)

    icon.setDisplaySize(CAPTURED_ICON_SIZE, CAPTURED_ICON_SIZE)
    icon.setDepth(this.depth + 1)
    this.capturedIcons.push(icon)
    this.add(icon)
  }

  private layoutCaptureRow() {
    const iconCount = this.capturedIcons.length
    const hasPoints = this.currentPointsLabel.text.length > 0
    const iconsWidth = iconCount > 0
      ? CAPTURED_ICON_SIZE + (iconCount - 1) * CAPTURED_ICON_SPACING
      : 0
    const pointsWidth = hasPoints ? this.currentPointsLabel.width : 0
    const textOffset = hasPoints && iconCount > 0 ? ICON_TEXT_GAP : 0
    const totalWidth = iconsWidth + textOffset + pointsWidth
    const rowStartX = -totalWidth / 2

    for (let index = 0; index < iconCount; index += 1) {
      const icon = this.capturedIcons[index]

      icon.setPosition(
        rowStartX + CAPTURED_ICON_SIZE / 2 + index * CAPTURED_ICON_SPACING,
        CAPTURE_ROW_Y,
      )
    }

    this.currentPointsLabel.setPosition(rowStartX + iconsWidth + textOffset, CAPTURE_ROW_Y)
  }
}
