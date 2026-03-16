import { Scene } from 'phaser'
import {
  COLORS,
  FONT_SIZES,
} from '@/config/ui'

interface GameOverData {
  message?: string
}

export class GameOver extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera
  background: Phaser.GameObjects.Image
  gameover_text: Phaser.GameObjects.Text

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

    this.input.once('pointerdown', () => {
      this.scene.start('MainMenu')
    })
  }
}
