import type { Scene } from 'phaser'
import { GameObjects } from 'phaser'

export class BoardSquare extends GameObjects.Rectangle {
  row: number
  col: number
  private readonly baseColor: number

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

    this.on('pointerover', () => this.setFillStyle(0xF6E27F))
    this.on('pointerout', () => this.setFillStyle(this.baseColor))
    this.on('pointerdown', () => this.setFillStyle(0x4CB5F5))

    scene.add.existing(this)
  }
}
