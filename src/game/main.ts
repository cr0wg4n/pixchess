import { AUTO, Game } from 'phaser'
import { COLORS } from '@/config/ui'
import { Boot } from './scenes/Boot'
import { ChessBoard } from './scenes/Chessboard'
import { GameOver } from './scenes/GameOver'
import { MainMenu } from './scenes/MainMenu'
import { Preloader } from './scenes/Preloader'

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: 768,
  height: 768,
  parent: 'game-container',
  backgroundColor: COLORS.primary.background,
  scene: [
    Boot,
    Preloader,
    MainMenu,
    ChessBoard,
    GameOver,
  ],
  pixelArt: true,
}

function StartGame(parent: string) {
  return new Game({
    ...config,
    parent,
  })
}

export default StartGame
