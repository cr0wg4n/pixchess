import type { Scene } from 'phaser'
import { GameObjects } from 'phaser'
import { COLORS } from '@/config/ui'
import {
  SfxEvent,
  SoundComposer,
  soundVolumeController,
} from '@/game/sounds/SoundComposer'

interface SfxSoundBarOptions {
  x: number
  y: number
  onChange?: (value: number) => void
}

interface VolumeStep {
  label: string
  value: number
}

const VOLUME_STEPS: VolumeStep[] = [
  { label: 'OFF', value: 0 },
  { label: 'LOW', value: 0.33 },
  { label: 'MED', value: 0.66 },
  { label: 'HIGH', value: 1 },
]

const BTN_W = 68
const BTN_H = 30
const BTN_GAP = 6
const TOTAL_W = VOLUME_STEPS.length * BTN_W + (VOLUME_STEPS.length - 1) * BTN_GAP
const LABEL_OFFSET_Y = -28

export class SfxSoundBar extends GameObjects.Container {
  private selectedStepIndex = 0
  private readonly buttons: { bg: GameObjects.Rectangle, text: GameObjects.Text }[] = []
  private readonly onChange?: (value: number) => void
  private readonly soundComposer: SoundComposer

  constructor(scene: Scene, options: SfxSoundBarOptions) {
    super(scene, options.x, options.y)

    this.onChange = options.onChange
    this.soundComposer = new SoundComposer(scene)

    const title = scene.add.text(0, LABEL_OFFSET_Y, 'SFX Volume', {
      fontFamily: 'primary',
      fontSize: 16,
      color: COLORS.primary.text,
      stroke: COLORS.primary.textStroke,
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5)

    this.add(title)

    for (let i = 0; i < VOLUME_STEPS.length; i++) {
      const step = VOLUME_STEPS[i]
      const x = -TOTAL_W / 2 + i * (BTN_W + BTN_GAP) + BTN_W / 2

      const bg = scene.add.rectangle(
        x,
        0,
        BTN_W,
        BTN_H,
        COLORS.difficultySelector.button.fill,
        COLORS.difficultySelector.button.state.defaultAlpha,
      )
      bg.setStrokeStyle(2, COLORS.difficultySelector.button.stroke, 0.7)
      bg.setInteractive({ useHandCursor: true })

      const text = scene.add.text(x, 0, step.label, {
        fontFamily: 'primary',
        fontSize: 12,
        color: COLORS.primary.text,
        stroke: COLORS.primary.textStroke,
        strokeThickness: 2,
        align: 'center',
      }).setOrigin(0.5)
      text.setInteractive({ useHandCursor: true })

      bg.on('pointerdown', () => this.selectStep(i))
      text.on('pointerdown', () => this.selectStep(i))
      bg.on('pointerover', () => {
        if (this.selectedStepIndex !== i) {
          bg.setFillStyle(
            COLORS.difficultySelector.button.fill,
            COLORS.difficultySelector.button.state.hoverAlpha,
          )
        }
      })
      bg.on('pointerout', () => this.refreshButton(i))

      this.add(bg)
      this.add(text)
      this.buttons.push({ bg, text })
    }

    scene.add.existing(this)
    this.selectedStepIndex = this.getNearestStepIndex(soundVolumeController.getMasterVolume())
    this.refreshAllButtons()
  }

  private selectStep(stepIndex: number) {
    this.selectedStepIndex = stepIndex
    const step = VOLUME_STEPS[stepIndex]

    soundVolumeController.setMasterVolume(step.value)
    this.soundComposer.play(SfxEvent.MenuClick, { volume: 1 })
    this.refreshAllButtons()
    this.onChange?.(step.value)
  }

  private getNearestStepIndex(volume: number) {
    let nearestStepIndex = 0
    let nearestDistance = Number.POSITIVE_INFINITY

    for (let i = 0; i < VOLUME_STEPS.length; i++) {
      const distance = Math.abs(VOLUME_STEPS[i].value - volume)

      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestStepIndex = i
      }
    }

    return nearestStepIndex
  }

  private refreshAllButtons() {
    for (let i = 0; i < this.buttons.length; i++) {
      this.refreshButton(i)
    }
  }

  private refreshButton(index: number) {
    const isActive = index === this.selectedStepIndex
    const { bg, text } = this.buttons[index]

    if (isActive) {
      bg.setFillStyle(
        COLORS.difficultySelector.button.fill,
        COLORS.difficultySelector.button.state.activeAlpha,
      )
      text.setColor(COLORS.difficultySelector.label.selectedText)
      text.setStroke(COLORS.difficultySelector.label.selectedStroke, 0)
      return
    }

    bg.setFillStyle(
      COLORS.difficultySelector.button.fill,
      COLORS.difficultySelector.button.state.defaultAlpha,
    )
    text.setColor(COLORS.primary.text)
    text.setStroke(COLORS.primary.textStroke, 2)
  }
}
