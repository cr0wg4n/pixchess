import type { Scene } from 'phaser'
import { GameObjects } from 'phaser'

export class BoardSquare extends GameObjects.Rectangle {
  row: number
  col: number
  private readonly baseColor: number
  private readonly highlightOverlay: GameObjects.Rectangle
  private readonly highlightStrokeOverlay: GameObjects.Rectangle
  private pointerOver = false
  private readonly hoverColor = 0xF6E27F

  constructor(
    scene: Scene,
    row: number,
    col: number,
    x: number,
    y: number,
    size: number,
    color: number,
  ) {
    super(scene, x, y, size, size, color)

    this.row = row
    this.col = col
    this.baseColor = color

    this.setOrigin(0)
    this.setInteractive({ useHandCursor: true })
    scene.add.existing(this)

    this.highlightOverlay = scene.add.rectangle(x, y, size, size, 0xFFFFFF, 0.50)
    this.highlightOverlay.setOrigin(0)
    this.highlightOverlay.setVisible(false)
    this.highlightOverlay.setDepth(this.depth + 1)

    // Inset by 1px so the 2px stroke stays visually inside the square.
    this.highlightStrokeOverlay = scene.add.rectangle(x + 1, y + 1, size - 2, size - 2)
    this.highlightStrokeOverlay.setOrigin(0)
    this.highlightStrokeOverlay.setStrokeStyle(2, 0xFFFFFF, 1)
    this.highlightStrokeOverlay.setVisible(false)
    this.highlightStrokeOverlay.setDepth(this.depth + 2)

    this.once('destroy', () => {
      this.highlightOverlay.destroy()
      this.highlightStrokeOverlay.destroy()
    })

    this.on('pointerover', () => {
      this.pointerOver = true
      this.refreshFill()
    })
    this.on('pointerout', () => {
      this.pointerOver = false
      this.refreshFill()
    })
  }

  setHighlight(strokeColor = 0xFFFFFF, fillColor = 0xFFFFFF, fillAlpha = 0.25, strokeAlpha = 1) {
    this.highlightOverlay.setFillStyle(fillColor, fillAlpha)
    this.highlightOverlay.setVisible(true)

    if (strokeAlpha <= 0) {
      this.highlightStrokeOverlay.setVisible(false)
      return this
    }

    this.highlightStrokeOverlay.setStrokeStyle(2, strokeColor, strokeAlpha)
    this.highlightStrokeOverlay.setVisible(true)

    return this
  }

  clearHighlight() {
    this.highlightOverlay.setFillStyle(0xFFFFFF, 0.25)
    this.highlightOverlay.setVisible(false)
    this.highlightStrokeOverlay.setVisible(false)

    return this
  }

  setHoverState(isHovering: boolean) {
    this.pointerOver = isHovering
    this.refreshFill()

    return this
  }

  private refreshFill() {
    if (this.pointerOver) {
      this.setFillStyle(this.hoverColor)
      return
    }

    this.setFillStyle(this.baseColor)
  }
}
