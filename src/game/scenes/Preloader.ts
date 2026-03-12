import { Scene } from 'phaser'

export class Preloader extends Scene {
  constructor() {
    super('Preloader')
  }

  init() {}

  preload() {
    this.load.font('primary', 'assets/fonts/LowresPixel-Regular.otf')
    this.load.setPath('assets')
    this.load.setPath('assets/pieces')
    this.load.image('black-bishop', 'black-bishop.png')
    this.load.image('black-king', 'black-king.png')
    this.load.image('black-knight', 'black-knight.png')
    this.load.image('black-pawn', 'black-pawn.png')
    this.load.image('black-queen', 'black-queen.png')
    this.load.image('black-rook', 'black-rook.png')
    this.load.image('white-bishop', 'white-bishop.png')
    this.load.image('white-king', 'white-king.png')
    this.load.image('white-knight', 'white-knight.png')
    this.load.image('white-pawn', 'white-pawn.png')
    this.load.image('white-queen', 'white-queen.png')
    this.load.image('white-rook', 'white-rook.png')
  }

  create() {
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
    this.scene.start('MainMenu')
  }
}
