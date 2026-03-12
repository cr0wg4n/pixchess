import type { GameObjects } from 'phaser'
import { Scene } from 'phaser'
import {
  COLORS,
  FONT_SIZES,
} from '@/config/ui'

export class MainMenu extends Scene {
  title: GameObjects.Text
  mainBackground: GameObjects.Image

  constructor() {
    super('MainMenu')
  }

  create() {
    this.title = this.add.text(384, 210, 'PixChess', {
      fontFamily: 'primary',
      fontSize: FONT_SIZES.xl,
      color: COLORS.primary.text,
      stroke: COLORS.primary.textStroke,
      strokeThickness: 10,
      align: 'center',
    }).setOrigin(0.5)

    this.input.once('pointerdown', () => {
      this.scene.start('ChessBoard')
    })

    this.mainBackground = this.add.image(384, 384, 'background').setDepth(-1)
  }
}
