import type { GameObjects, Scene } from 'phaser'

export type EffectTarget = GameObjects.Image

export interface VisualEffect<TTarget extends EffectTarget = EffectTarget> {
  attach: (target: TTarget) => void
  sync?: (target: TTarget) => void
  destroy: () => void
}

export class VisualEffectsManager {
  private scene: Scene
  private effectsByTarget = new Map<EffectTarget, VisualEffect[]>()

  constructor(scene: Scene) {
    this.scene = scene
    this.scene.events.on('update', this.update, this)
  }

  addEffect(target: EffectTarget, effect: VisualEffect) {
    effect.attach(target)

    if (!this.effectsByTarget.has(target)) {
      this.effectsByTarget.set(target, [])

      target.once('destroy', () => {
        this.clearTargetEffects(target)
      })
    }

    const targetEffects = this.effectsByTarget.get(target)

    if (targetEffects) {
      targetEffects.push(effect)
    }

    effect.sync?.(target)

    return effect
  }

  clearTargetEffects(target: EffectTarget) {
    const targetEffects = this.effectsByTarget.get(target)

    if (!targetEffects) {
      return
    }

    for (const effect of targetEffects) {
      effect.destroy()
    }

    this.effectsByTarget.delete(target)
  }

  destroy() {
    this.scene.events.off('update', this.update, this)

    for (const [target] of this.effectsByTarget) {
      this.clearTargetEffects(target)
    }
  }

  private update() {
    for (const [target, effects] of this.effectsByTarget) {
      for (const effect of effects) {
        effect.sync?.(target)
      }
    }
  }
}
