import type { ChessBoardSceneData } from '@/game/helpers/chessboardSession'
import { Scene } from 'phaser'
import {
  COLORS,
  FONT_SIZES,
} from '@/config/ui'
import { Button } from '@/game/elements/Button'

interface GameOverData {
  message?: string
  retryData?: ChessBoardSceneData
}

export class GameOver extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera
  background: Phaser.GameObjects.Image
  gameover_text: Phaser.GameObjects.Text
  retryButton: Button
  backMenuButton: Button

  constructor() {
    super('GameOver')
  }

  create(data: GameOverData = {}) {
    this.camera = this.cameras.main

    this.background = this.add.image(384, 384, 'background').setDepth(-1)

    const message = data.message ?? 'Game Over'
    const centerX = this.camera.centerX
    const centerY = this.camera.centerY

    this.gameover_text = this.add.text(centerX, centerY, message, {
      fontFamily: 'primary',
      fontSize: FONT_SIZES.lg,
      color: COLORS.primary.text,
      stroke: COLORS.primary.textStroke,
      strokeThickness: 8,
      align: 'center',
    })
    this.gameover_text.setOrigin(0.5)

    this.retryButton = new Button(this, {
      x: centerX,
      y: centerY + 95,
      label: '▸  Retry',
      fontSize: FONT_SIZES.sm,
      onClick: () => {
        this.scene.start('ChessBoard', data.retryData ?? {})
      },
    })

    this.backMenuButton = new Button(this, {
      x: centerX,
      y: centerY + 155,
      label: '< Menu',
      fontSize: FONT_SIZES.xs,
      strokeThickness: 4,
      onClick: () => {
        this.scene.start('MainMenu')
      },
    })
  }
}
