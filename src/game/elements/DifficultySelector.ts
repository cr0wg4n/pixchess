import type { Scene } from 'phaser'
import { GameObjects } from 'phaser'
import { COLORS } from '@/config/ui'

interface DifficultySelectorOptions {
  x: number
  y: number
  onChange?: (level: number) => void
}

export const LEVELS = [
  { level: 1, label: 'Easy' },
  { level: 2, label: 'Friendly' },
  { level: 3, label: 'Medium' },
  { level: 4, label: 'Hard' },
  { level: 5, label: 'Insane' },
]

const BTN_W = 100
const BTN_H = 38
const BTN_GAP = 8
const TOTAL_W = LEVELS.length * BTN_W + (LEVELS.length - 1) * BTN_GAP
const LABEL_OFFSET_Y = -40
const BTNS_OFFSET_Y = 6

export class DifficultySelector extends GameObjects.Container {
  private selectedLevel: number
  private buttons: { bg: GameObjects.Rectangle, label: GameObjects.Text }[] = []
  private onChange?: (level: number) => void

  constructor(scene: Scene, options: DifficultySelectorOptions) {
    super(scene, options.x, options.y)

    this.selectedLevel = 2
    this.onChange = options.onChange

    // Section label
    const title = scene.add.text(0, LABEL_OFFSET_Y, 'Difficulty', {
      fontFamily: 'primary',
      fontSize: 18,
      color: COLORS.primary.text,
      stroke: COLORS.primary.textStroke,
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5)
    this.add(title)

    // Level buttons
    for (let i = 0; i < LEVELS.length; i++) {
      const { level, label } = LEVELS[i]
      const bx = -TOTAL_W / 2 + i * (BTN_W + BTN_GAP) + BTN_W / 2
      const by = BTNS_OFFSET_Y

      const bg = scene.add.rectangle(
        bx,
        by,
        BTN_W,
        BTN_H,
        COLORS.difficultySelector.button.fill,
        COLORS.difficultySelector.button.state.defaultAlpha,
      )
      bg.setStrokeStyle(2, COLORS.difficultySelector.button.stroke, 0.7)
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

      lbl.setData('level', level)
      bg.setData('level', level)
      bg.setData('label', label)

      bg.on('pointerover', () => {
        if (this.selectedLevel !== level) {
          bg.setFillStyle(
            COLORS.difficultySelector.button.fill,
            COLORS.difficultySelector.button.state.hoverAlpha,
          )
        }
      })
      bg.on('pointerout', () => {
        this.refreshButton(i)
      })
      bg.on('pointerdown', () => this.selectLevel(level))
      lbl.on('pointerdown', () => this.selectLevel(level))

      this.add(bg)
      this.add(lbl)
      this.buttons.push({ bg, label: lbl })
    }

    scene.add.existing(this)
    this.refreshAllButtons()
  }

  getLevel(): number {
    return this.selectedLevel
  }

  private selectLevel(level: number) {
    this.selectedLevel = level
    this.refreshAllButtons()
    this.onChange?.(level)
  }

  private refreshAllButtons() {
    for (let i = 0; i < this.buttons.length; i++) {
      this.refreshButton(i)
    }
  }

  private refreshButton(i: number) {
    const { bg } = this.buttons[i]
    const level = LEVELS[i].level
    if (this.selectedLevel === level) {
      bg.setFillStyle(
        COLORS.difficultySelector.button.fill,
        COLORS.difficultySelector.button.state.activeAlpha,
      )
      this.buttons[i].label.setColor(COLORS.difficultySelector.label.selectedText)
      this.buttons[i].label.setStroke(COLORS.difficultySelector.label.selectedStroke, 0)
    }
    else {
      bg.setFillStyle(
        COLORS.difficultySelector.button.fill,
        COLORS.difficultySelector.button.state.defaultAlpha,
      )
      this.buttons[i].label.setColor(COLORS.primary.text)
      this.buttons[i].label.setStroke(COLORS.primary.textStroke, 3)
    }
  }
}
