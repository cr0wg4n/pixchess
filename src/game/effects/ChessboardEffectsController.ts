import type { Scene } from 'phaser'
import type { Piece } from '@/game/elements/Piece'
import { CHESS_CAPTURE_EFFECTS, CHESS_MOVE_EFFECTS } from '@/config/chessEffects'
import { getPieceValue } from '@/game/domain/pieceValues'
import {
  PieceColor,
  PieceType,
} from '@/game/types'

interface ChessboardEffectsControllerOptions {
  getBoardMetrics: () => { offsetX: number, offsetY: number }
  getViewRow: (boardRow: number) => number
  tileSize: number
}

class ChessboardEffectsController {
  private scene: Scene
  private getBoardMetrics: ChessboardEffectsControllerOptions['getBoardMetrics']
  private getViewRow: ChessboardEffectsControllerOptions['getViewRow']
  private tileSize: number
  private cameraRotationDriver = { angle: 0 }
  private cameraRotationTween: Phaser.Tweens.Tween | null = null

  constructor(scene: Scene, options: ChessboardEffectsControllerOptions) {
    this.scene = scene
    this.getBoardMetrics = options.getBoardMetrics
    this.getViewRow = options.getViewRow
    this.tileSize = options.tileSize
  }

  destroy() {
    this.cameraRotationTween?.stop()
    this.cameraRotationTween = null
    this.cameraRotationDriver.angle = 0

    const camera = this.scene.cameras?.main

    if (camera) {
      camera.setAngle(0)
    }
  }

  playCaptureEffect(x: number, y: number, capturedColor?: PieceColor, capturedPieceType: PieceType = PieceType.PAWN) {
    this.shakeBoardOnCapture(capturedPieceType)
    this.emitCaptureParticles(x, y, capturedColor)
  }

  tweenPieceTo(pieceSprite: Piece, pieceColor: PieceColor, row: number, col: number) {
    const startX = pieceSprite.x
    const startY = pieceSprite.y
    const boardMetrics = this.getBoardMetrics()
    const x = boardMetrics.offsetX + col * this.tileSize + this.tileSize / 2
    const y = boardMetrics.offsetY + this.getViewRow(row) * this.tileSize + this.tileSize / 2
    const distance = Math.hypot(x - startX, y - startY)
    const movedSquares = Math.max(1, Math.round(distance / this.tileSize))
    const duration = CHESS_MOVE_EFFECTS.tweenDurationMs

    const stopTail = this.emitMoveTrailParticles(pieceSprite, pieceColor, x, y, duration)

    this.scene.tweens.add({
      targets: pieceSprite,
      x,
      y,
      duration,
      onComplete: () => {
        stopTail()

        if (distance > 2) {
          this.emitMoveEndBurst(x, y, pieceColor, movedSquares)
        }
      },
    })
  }

  private shakeBoardOnCapture(capturedPieceType: PieceType) {
    const camera = this.scene.cameras?.main

    if (!camera) {
      return
    }

    const pieceValue = getPieceValue(capturedPieceType)
    const duration = Math.min(
      CHESS_CAPTURE_EFFECTS.shake.maxDurationMs,
      CHESS_CAPTURE_EFFECTS.shake.baseDurationMs + pieceValue * CHESS_CAPTURE_EFFECTS.shake.durationPerPointMs,
    )
    const intensity = Math.min(
      CHESS_CAPTURE_EFFECTS.shake.maxIntensity,
      CHESS_CAPTURE_EFFECTS.shake.baseIntensity + pieceValue * CHESS_CAPTURE_EFFECTS.shake.intensityPerPoint,
    )

    camera.shake(duration, intensity)

    const targetRotation = CHESS_CAPTURE_EFFECTS.shake.rotation.baseDegrees
      + pieceValue * CHESS_CAPTURE_EFFECTS.shake.rotation.degreesPerPoint
    const rotationAmount = Math.min(
      CHESS_CAPTURE_EFFECTS.shake.rotation.maxDegrees,
      targetRotation,
    ) * (Math.random() < 0.5 ? -1 : 1)

    this.cameraRotationTween?.stop()
    this.cameraRotationTween = null
    this.cameraRotationDriver.angle = 0
    camera.setAngle(0)
    this.cameraRotationTween = this.scene.tweens.add({
      targets: this.cameraRotationDriver,
      angle: rotationAmount,
      duration: CHESS_CAPTURE_EFFECTS.shake.rotation.tweenDurationMs,
      ease: 'Sine.easeInOut',
      yoyo: true,
      onUpdate: () => {
        const currentCamera = this.scene.cameras?.main

        if (currentCamera) {
          currentCamera.setAngle(this.cameraRotationDriver.angle)
        }
      },
      onComplete: () => {
        const currentCamera = this.scene.cameras?.main

        if (currentCamera) {
          currentCamera.setAngle(0)
        }
        this.cameraRotationDriver.angle = 0
        this.cameraRotationTween = null
      },
    })
  }

  private emitCaptureParticles(x: number, y: number, capturedColor?: PieceColor) {
    const particleColor = capturedColor === PieceColor.WHITE
      ? CHESS_CAPTURE_EFFECTS.particles.color.light
      : CHESS_CAPTURE_EFFECTS.particles.color.dark
    const particleCount = CHESS_CAPTURE_EFFECTS.particles.count
    const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)

    for (let index = 0; index < particleCount; index += 1) {
      const spread = this.tileSize * CHESS_CAPTURE_EFFECTS.particles.spawnSpreadMultiplier
      const spawnX = x + randomBetween(-spread, spread)
      const spawnY = y + randomBetween(-spread, spread)
      const particleSize = randomBetween(
        CHESS_CAPTURE_EFFECTS.particles.radius.min,
        CHESS_CAPTURE_EFFECTS.particles.radius.max,
      ) * 2
      const particle = this.scene.add.rectangle(
        spawnX,
        spawnY,
        particleSize,
        particleSize,
        particleColor,
        CHESS_CAPTURE_EFFECTS.particles.alpha,
      )
      particle.setDepth(50)

      const angle = randomBetween(0, Math.PI * 2)
      const distance = randomBetween(
        CHESS_CAPTURE_EFFECTS.particles.driftDistance.min,
        CHESS_CAPTURE_EFFECTS.particles.driftDistance.max,
      )
      const targetX = spawnX + Math.cos(angle) * distance
      const targetY = spawnY + Math.sin(angle) * distance

      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0,
        duration: randomBetween(
          CHESS_CAPTURE_EFFECTS.particles.durationMs.min,
          CHESS_CAPTURE_EFFECTS.particles.durationMs.max,
        ),
        ease: 'Cubic.easeOut',
        onComplete: () => {
          particle.destroy()
        },
      })
    }
  }

  private emitMoveTrailParticles(
    pieceSprite: Piece,
    pieceColor: PieceColor,
    targetX: number,
    targetY: number,
    duration: number,
  ) {
    const fromX = pieceSprite.x
    const fromY = pieceSprite.y
    const distance = Math.hypot(targetX - fromX, targetY - fromY)

    if (distance < 2) {
      return () => {}
    }

    const particleColor = pieceColor === PieceColor.WHITE
      ? CHESS_MOVE_EFFECTS.trail.color.light
      : CHESS_MOVE_EFFECTS.trail.color.dark
    const movedSquares = Math.max(1, Math.round(distance / this.tileSize))
    const intensity = 1 + (movedSquares - 1) * CHESS_MOVE_EFFECTS.trail.intensityPerExtraSquare
    const targetParticlesPerTick = Math.max(
      CHESS_MOVE_EFFECTS.trail.particlesPerTick.min,
      Math.min(
        CHESS_MOVE_EFFECTS.trail.particlesPerTick.max,
        Math.round(
          CHESS_MOVE_EFFECTS.trail.particlesPerTick.min
          + (movedSquares - 1) * CHESS_MOVE_EFFECTS.trail.particlesPerExtraSquare,
        ),
      ),
    )
    const sizeMultiplier = 1 + (movedSquares - 1) * CHESS_MOVE_EFFECTS.trail.sizeMultiplierPerExtraSquare
    const durationMultiplier = 1 + (movedSquares - 1) * CHESS_MOVE_EFFECTS.trail.durationMultiplierPerExtraSquare
    const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)
    const moveAngle = Math.atan2(targetY - fromY, targetX - fromX)
    const tickMs = CHESS_MOVE_EFFECTS.trail.tickMs
    const sparseTargetParticlesPerTick = Math.max(1, Math.round(targetParticlesPerTick * 0.55))
    let tickIndex = 0
    const tailEvent = this.scene.time.addEvent({
      delay: tickMs,
      loop: true,
      callback: () => {
        tickIndex += 1

        const remainingDistance = Math.hypot(targetX - pieceSprite.x, targetY - pieceSprite.y)
        const moveProgress = Math.min(1, Math.max(0, 1 - remainingDistance / distance))
        const progressiveRatio = moveProgress * moveProgress
        const emissionStride = Math.max(2, Math.round(4 - moveProgress * 2))

        if (tickIndex % emissionStride !== 0) {
          return
        }

        const particlesPerTick = Math.max(
          1,
          Math.round(
            1 + (sparseTargetParticlesPerTick - 1) * progressiveRatio,
          ),
        )

        for (let burstIndex = 0; burstIndex < particlesPerTick; burstIndex += 1) {
          const originX = pieceSprite.x + randomBetween(
            CHESS_MOVE_EFFECTS.trail.spawnJitter.min,
            CHESS_MOVE_EFFECTS.trail.spawnJitter.max,
          )
          const originY = pieceSprite.y + randomBetween(
            CHESS_MOVE_EFFECTS.trail.spawnJitter.min,
            CHESS_MOVE_EFFECTS.trail.spawnJitter.max,
          )
          const spreadAngle = moveAngle + Math.PI + randomBetween(
            CHESS_MOVE_EFFECTS.trail.angleJitter.min,
            CHESS_MOVE_EFFECTS.trail.angleJitter.max,
          )
          const driftDistance = randomBetween(
            CHESS_MOVE_EFFECTS.trail.driftDistance.min,
            CHESS_MOVE_EFFECTS.trail.driftDistance.max,
          ) * intensity
          const endX = originX + Math.cos(spreadAngle) * driftDistance
          const endY = originY + Math.sin(spreadAngle) * driftDistance
          const progressiveSizeMultiplier = 0.4 + progressiveRatio * 1.25
          const particleSize = randomBetween(
            CHESS_MOVE_EFFECTS.trail.radius.min,
            CHESS_MOVE_EFFECTS.trail.radius.max,
          ) * 2 * sizeMultiplier * progressiveSizeMultiplier
          const particle = this.scene.add.rectangle(
            originX,
            originY,
            particleSize,
            particleSize,
            particleColor,
            CHESS_MOVE_EFFECTS.trail.alpha,
          )
          particle.setDepth(CHESS_MOVE_EFFECTS.trail.depth)

          this.scene.tweens.add({
            targets: particle,
            x: endX,
            y: endY,
            alpha: 0,
            scale: 0.25,
            duration: randomBetween(
              CHESS_MOVE_EFFECTS.trail.durationMs.min,
              CHESS_MOVE_EFFECTS.trail.durationMs.max,
            ) * durationMultiplier,
            ease: 'Sine.easeOut',
            onComplete: () => {
              particle.destroy()
            },
          })
        }
      },
    })

    this.scene.time.delayedCall(duration, () => {
      tailEvent.remove()
    })

    return () => {
      tailEvent.remove()
    }
  }

  private emitMoveEndBurst(x: number, y: number, pieceColor: PieceColor, movedSquares = 1) {
    const particleColor = pieceColor === PieceColor.WHITE
      ? CHESS_MOVE_EFFECTS.trail.color.light
      : CHESS_MOVE_EFFECTS.trail.color.dark
    const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)
    const burstCount = CHESS_MOVE_EFFECTS.endBurst.count
      + Math.max(0, movedSquares - 1) * CHESS_MOVE_EFFECTS.endBurst.countPerExtraSquare

    for (let index = 0; index < burstCount; index += 1) {
      const angle = randomBetween(0, Math.PI * 2)
      const distance = randomBetween(
        CHESS_MOVE_EFFECTS.endBurst.driftDistance.min,
        CHESS_MOVE_EFFECTS.endBurst.driftDistance.max,
      )
      const targetX = x + Math.cos(angle) * distance
      const targetY = y + Math.sin(angle) * distance
      const particleSize = randomBetween(
        CHESS_MOVE_EFFECTS.endBurst.radius.min,
        CHESS_MOVE_EFFECTS.endBurst.radius.max,
      ) * 2
      const particle = this.scene.add.rectangle(
        x,
        y,
        particleSize,
        particleSize,
        particleColor,
        CHESS_MOVE_EFFECTS.endBurst.alpha,
      )
      particle.setDepth(CHESS_MOVE_EFFECTS.endBurst.depth)

      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0,
        duration: randomBetween(
          CHESS_MOVE_EFFECTS.endBurst.durationMs.min,
          CHESS_MOVE_EFFECTS.endBurst.durationMs.max,
        ),
        ease: 'Sine.easeOut',
        onComplete: () => {
          particle.destroy()
        },
      })
    }
  }
}

export {
  ChessboardEffectsController,
}
