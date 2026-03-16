import type { Scene } from 'phaser'
import type { PieceTextureKey } from '@/game/types'
import { GameObjects } from 'phaser'
import { COLORS } from '@/config/ui'
import {
  PieceColor,
} from '@/game/types'

interface PlayerProfileOptions {
  avatarSide?: 'left' | 'right'
  color: PieceColor
  name: string
}

const PROFILE_HEIGHT = 60
const PROFILE_WIDTH = 340
const PROFILE_SIDE_PADDING = 8
const AVATAR_BOX_SIZE = 45
const AVATAR_TO_CONTENT_GAP = 12
const CAPTURED_ICON_SIZE = 15
const CAPTURED_ICON_SPACING = 15
const ICON_TEXT_GAP = 10
const CAPTURE_ROW_Y = 12
const CLOCK_MARGIN_X = 14

export class PlayerProfile extends GameObjects.Container {
  private panel: GameObjects.Rectangle
  private avatarBox: GameObjects.Rectangle
  private nameLabel: GameObjects.Text
  private clockLabel: GameObjects.Text
  private currentPointsLabel: GameObjects.Text
  private capturedIcons: GameObjects.Image[] = []
  private avatarSide: 'left' | 'right'
  private contentStartX: number

  constructor(scene: Scene, x: number, y: number, options: PlayerProfileOptions) {
    super(scene, x, y)

    const palette = options.color === PieceColor.WHITE
      ? COLORS.playerProfile.white
      : COLORS.playerProfile.black
    this.avatarSide = options.avatarSide ?? 'left'
    const hasLeftAvatar = this.avatarSide === 'left'
    this.contentStartX = hasLeftAvatar
      ? -PROFILE_WIDTH / 2 + PROFILE_SIDE_PADDING + AVATAR_BOX_SIZE + AVATAR_TO_CONTENT_GAP
      : -PROFILE_WIDTH / 2 + PROFILE_SIDE_PADDING

    this.panel = scene.add.rectangle(0, 0, PROFILE_WIDTH, PROFILE_HEIGHT, palette.background, 0.95)
    this.panel.setStrokeStyle(2, palette.border, 1)

    const avatarX = hasLeftAvatar
      ? -PROFILE_WIDTH / 2 + PROFILE_SIDE_PADDING + AVATAR_BOX_SIZE / 2
      : PROFILE_WIDTH / 2 - PROFILE_SIDE_PADDING - AVATAR_BOX_SIZE / 2
    this.avatarBox = scene.add.rectangle(avatarX, 0, AVATAR_BOX_SIZE, AVATAR_BOX_SIZE, palette.border, 0.22)
    this.avatarBox.setStrokeStyle(2, palette.border, 0.9)

    this.nameLabel = scene.add.text(0, 0, options.name, {
      fontFamily: 'primary',
      fontSize: 20,
      color: palette.text,
      align: 'left',
    })
    this.nameLabel.setOrigin(0, 0.5)
    this.nameLabel.setPosition(this.contentStartX, -15)

    this.clockLabel = scene.add.text(0, 0, '10:00', {
      fontFamily: 'primary',
      fontSize: 20,
      color: palette.text,
      align: 'right',
    })
    this.clockLabel.setOrigin(1, 0.5)
    this.clockLabel.setPosition(
      (hasLeftAvatar
        ? PROFILE_WIDTH / 2 - PROFILE_SIDE_PADDING
        : PROFILE_WIDTH / 2 - PROFILE_SIDE_PADDING - AVATAR_BOX_SIZE - AVATAR_TO_CONTENT_GAP)
      - CLOCK_MARGIN_X,
      -15,
    )

    this.currentPointsLabel = scene.add.text(0, CAPTURE_ROW_Y, '', {
      fontFamily: 'primary',
      fontSize: 16,
      color: palette.text,
      align: 'left',
    })
    this.currentPointsLabel.setOrigin(0, 0.5)

    this.add([this.panel, this.avatarBox, this.nameLabel, this.clockLabel, this.currentPointsLabel])
    this.setSize(PROFILE_WIDTH, PROFILE_HEIGHT)
    this.setDepth(30)

    scene.add.existing(this)
  }

  setName(name: string) {
    this.nameLabel.setText(name)

    return this
  }

  setClock(milliseconds: number, isActive = false) {
    this.clockLabel.setText(this.formatClock(milliseconds))
    this.clockLabel.setAlpha(isActive ? 1 : 0.82)

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
    const x = this.contentStartX + CAPTURED_ICON_SIZE / 2 + index * CAPTURED_ICON_SPACING
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
    const textOffset = hasPoints && iconCount > 0 ? ICON_TEXT_GAP : 0
    const rowStartX = this.contentStartX

    for (let index = 0; index < iconCount; index += 1) {
      const icon = this.capturedIcons[index]

      icon.setPosition(
        rowStartX + CAPTURED_ICON_SIZE / 2 + index * CAPTURED_ICON_SPACING,
        CAPTURE_ROW_Y,
      )
    }

    this.currentPointsLabel.setPosition(rowStartX + iconsWidth + textOffset, CAPTURE_ROW_Y)
  }

  private formatClock(milliseconds: number) {
    const safeMilliseconds = Math.max(0, Math.floor(milliseconds))
    const totalSeconds = Math.floor(safeMilliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const paddedSeconds = String(seconds).padStart(2, '0')

    return `${minutes}:${paddedSeconds}`
  }
}
