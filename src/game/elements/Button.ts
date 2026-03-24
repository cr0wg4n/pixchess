import type { Scene } from 'phaser'
import { GameObjects } from 'phaser'
import {
  COLORS,
  FONT_SIZES,
} from '@/config/ui'
import { SfxEvent, SoundComposer } from '@/game/sounds/SoundComposer'

interface ButtonOptions {
  x: number
  y: number
  label: string
  onClick?: () => void
  fontSize?: number
  strokeThickness?: number
  align?: Phaser.Types.GameObjects.Text.TextStyle['align']
  originX?: number
  originY?: number
  depth?: number
  visible?: boolean
  style?: Omit<Phaser.Types.GameObjects.Text.TextStyle, 'fontSize' | 'color' | 'stroke' | 'strokeThickness' | 'align'>
}

export class Button extends GameObjects.Text {
  constructor(scene: Scene, options: ButtonOptions) {
    const soundComposer = new SoundComposer(scene)

    super(scene, options.x, options.y, options.label, {
      fontFamily: 'primary',
      fontSize: options.fontSize ?? FONT_SIZES.sm,
      color: COLORS.primary.text,
      stroke: COLORS.primary.textStroke,
      strokeThickness: options.strokeThickness ?? 6,
      align: options.align ?? 'center',
      ...options.style,
    })

    this.setOrigin(options.originX ?? 0.5, options.originY ?? 0.5)
    this.setInteractive({ useHandCursor: true })

    if (typeof options.depth === 'number') {
      this.setDepth(options.depth)
    }

    if (typeof options.visible === 'boolean') {
      this.setVisible(options.visible)
    }

    this.on('pointerdown', () => {
      soundComposer.play(SfxEvent.MenuClick)

      options.onClick?.()
    })

    scene.add.existing(this)
  }
}
