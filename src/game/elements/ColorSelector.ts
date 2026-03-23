import type { Scene } from 'phaser'
import { GameObjects } from 'phaser'
import { COLORS } from '@/config/ui'

export type PlayerColorChoice = 'white' | 'random' | 'black'

interface ColorSelectorOptions {
  x: number
  y: number
  onChange?: (color: PlayerColorChoice) => void
}

const OPTIONS: { value: PlayerColorChoice, label: string }[] = [
  { value: 'white', label: '♔  White' },
  { value: 'random', label: '?  Random' },
  { value: 'black', label: '♚  Black' },
]

const BTN_W = 96
const BTN_H = 38
const BTN_GAP = 8
const TOTAL_W = OPTIONS.length * BTN_W + (OPTIONS.length - 1) * BTN_GAP
const LABEL_OFFSET_Y = -28
const BTNS_OFFSET_Y = 6

export class ColorSelector extends GameObjects.Container {
  private selected: PlayerColorChoice = 'random'
  private buttons: { bg: GameObjects.Rectangle, lbl: GameObjects.Text }[] = []
  private onChange?: (color: PlayerColorChoice) => void

  constructor(scene: Scene, options: ColorSelectorOptions) {
    super(scene, options.x, options.y)
    this.onChange = options.onChange

    const title = scene.add.text(0, LABEL_OFFSET_Y, 'Play as', {
      fontFamily: 'primary',
      fontSize: 18,
      color: COLORS.primary.text,
      stroke: COLORS.primary.textStroke,
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5)
    this.add(title)

    for (let i = 0; i < OPTIONS.length; i++) {
      const { value, label } = OPTIONS[i]
      const bx = -TOTAL_W / 2 + i * (BTN_W + BTN_GAP) + BTN_W / 2
      const by = BTNS_OFFSET_Y

      const bg = scene.add.rectangle(bx, by, BTN_W, BTN_H, 0xFFFFFF, 0.25)
      bg.setStrokeStyle(2, 0xFFFFFF, 0.7)
      bg.setInteractive({ useHandCursor: true })

      const lbl = scene.add.text(bx, by, label, {
        fontFamily: 'primary',
        fontSize: 14,
        color: COLORS.primary.text,
        stroke: COLORS.primary.textStroke,
        strokeThickness: 3,
        align: 'center',
      })
      lbl.setOrigin(0.5)
      lbl.setInteractive({ useHandCursor: true })

      bg.on('pointerover', () => {
        if (this.selected !== value)
          bg.setFillStyle(0xFFFFFF, 0.4)
      })
      bg.on('pointerout', () => this.refreshButton(i))
      bg.on('pointerdown', () => this.selectColor(value))
      lbl.on('pointerdown', () => this.selectColor(value))

      this.add(bg)
      this.add(lbl)
      this.buttons.push({ bg, lbl })
    }

    scene.add.existing(this)
    this.refreshAllButtons()
  }

  getColor(): PlayerColorChoice {
    return this.selected
  }

  private selectColor(color: PlayerColorChoice) {
    this.selected = color
    this.refreshAllButtons()
    this.onChange?.(color)
  }

  private refreshAllButtons() {
    for (let i = 0; i < this.buttons.length; i++)
      this.refreshButton(i)
  }

  private refreshButton(i: number) {
    const { bg, lbl } = this.buttons[i]
    const value = OPTIONS[i].value
    if (this.selected === value) {
      bg.setFillStyle(0xFFFFFF, 0.82)
      lbl.setColor('#1a1a1a')
      lbl.setStroke('#1a1a1a', 0)
    }
    else {
      bg.setFillStyle(0xFFFFFF, 0.2)
      lbl.setColor(COLORS.primary.text)
      lbl.setStroke(COLORS.primary.textStroke, 3)
    }
  }
}
