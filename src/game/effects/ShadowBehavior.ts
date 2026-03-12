import type { GameObjects, Scene } from 'phaser'
import type { VisualEffect } from '@/game/effects/VisualEffectsManager'

interface ShadowBehaviorOptions {
  offsetX?: number
  offsetY?: number
  alpha?: number
  scaleMultiplier?: number
  tintColor?: number
  depthOffset?: number
}

const DEFAULT_OPTIONS: Required<ShadowBehaviorOptions> = {
  offsetX: 2,
  offsetY: 1,
  alpha: 0.15,
  scaleMultiplier: 1.05,
  tintColor: 0x000000,
  depthOffset: -1,
}

export class ShadowBehavior implements VisualEffect<GameObjects.Image> {
  private scene: Scene
  private options: Required<ShadowBehaviorOptions>
  private shadow: GameObjects.Image | null = null

  constructor(scene: Scene, options: ShadowBehaviorOptions = {}) {
    this.scene = scene
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    }
  }

  attach(target: GameObjects.Image) {
    const { offsetX, offsetY, tintColor, alpha } = this.options

    this.shadow = this.scene.add.image(target.x + offsetX, target.y + offsetY, target.texture.key)
    this.shadow.setTintFill(tintColor)
    this.shadow.setAlpha(alpha)
  }

  sync(target: GameObjects.Image) {
    if (!this.shadow) {
      return
    }

    const { offsetX, offsetY, scaleMultiplier, depthOffset } = this.options

    this.shadow.setPosition(target.x + offsetX, target.y + offsetY)
    this.shadow.setDisplaySize(
      target.displayWidth * scaleMultiplier,
      target.displayHeight * scaleMultiplier,
    )
    this.shadow.setDepth(target.depth + depthOffset)
  }

  destroy() {
    this.shadow?.destroy()
    this.shadow = null
  }
}
