import { Scene } from 'phaser'

export class Preloader extends Scene {
  constructor() {
    super('Preloader')
  }

  init() {}

  preload() {
    this.load.font('primary', 'assets/fonts/LowresPixel-Regular.otf')
    this.load.image('black-bishop', 'assets/pieces/black-bishop.png')
    this.load.image('black-king', 'assets/pieces/black-king.png')
    this.load.image('black-knight', 'assets/pieces/black-knight.png')
    this.load.image('black-pawn', 'assets/pieces/black-pawn.png')
    this.load.image('black-queen', 'assets/pieces/black-queen.png')
    this.load.image('black-rook', 'assets/pieces/black-rook.png')
    this.load.image('white-bishop', 'assets/pieces/white-bishop.png')
    this.load.image('white-king', 'assets/pieces/white-king.png')
    this.load.image('white-knight', 'assets/pieces/white-knight.png')
    this.load.image('white-pawn', 'assets/pieces/white-pawn.png')
    this.load.image('white-queen', 'assets/pieces/white-queen.png')
    this.load.image('white-rook', 'assets/pieces/white-rook.png')

    this.load.audio('sfx-chess-move', 'assets/songs/single_move.mp3')
    this.load.audio('sfx-chess-capture', 'assets/songs/win_piece.mp3')
    this.load.audio('sfx-chess-threat', 'assets/songs/thunder.mp3')
    this.load.audio('sfx-chess-end', 'assets/songs/loose_piece.mp3')
    this.load.audio('sfx-menu-click', 'assets/songs/menu_click.mp3')
  }

  create() {
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
    this.scene.start('MainMenu')
  }
}
