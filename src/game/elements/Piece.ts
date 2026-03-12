import type { Scene } from 'phaser'
import type { PieceTextureKey } from '@/game/types'
import { GameObjects } from 'phaser'

const PIECE_DEPTH = 20

export class Piece extends GameObjects.Image {
  identifier: string
  textureKey: PieceTextureKey

  constructor(
    scene: Scene,
    x: number,
    y: number,
    textureKey: PieceTextureKey,
    identifier: string,
  ) {
    super(scene, x, y, textureKey)

    this.identifier = identifier
    this.textureKey = textureKey

    scene.add.existing(this)
    this.setDepth(PIECE_DEPTH)
  }

  fitToCell(cellSize: number, padding = 10) {
    const availableSize = Math.max(cellSize - padding, 1)
    const largestSide = Math.max(this.width, this.height)

    if (largestSide <= 0) {
      return this
    }

    const scale = availableSize / largestSide
    this.setScale(scale)

    return this
  }
}
