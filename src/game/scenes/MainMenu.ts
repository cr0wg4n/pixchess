import type { GameObjects } from 'phaser'
import { Scene } from 'phaser'
import {
  COLORS,
  FONT_SIZES,
} from '@/config/ui'
import { ColorSelector } from '@/game/elements/ColorSelector'
import { DifficultySelector, LEVELS } from '@/game/elements/DifficultySelector'

export class MainMenu extends Scene {
  title: GameObjects.Text
  mainBackground: GameObjects.Image
  private difficultySelector: DifficultySelector | null = null
  private colorSelector: ColorSelector | null = null
  private modeGroup: { setVisible: (v: boolean) => void }[] = []
  private botSetupGroup: { setVisible: (v: boolean) => void }[] = []

  constructor() {
    super('MainMenu')
  }

  create() {
    this.title = this.add.text(384, 200, 'PixChess', {
      fontFamily: 'primary',
      fontSize: FONT_SIZES.xl,
      color: COLORS.primary.text,
      stroke: COLORS.primary.textStroke,
      strokeThickness: 10,
      align: 'center',
    }).setOrigin(0.5)

    // --- Mode selection view ---
    const twoPlayersBtn = this.add.text(170, 400, '▸  2 Players', {
      fontFamily: 'primary',
      fontSize: FONT_SIZES.sm,
      color: COLORS.primary.text,
      stroke: COLORS.primary.textStroke,
      strokeThickness: 6,
      align: 'left',
    })
    twoPlayersBtn.setOrigin(0, 0.5)
    twoPlayersBtn.setInteractive({ useHandCursor: true })
    twoPlayersBtn.on('pointerdown', () => {
      this.scene.start('ChessBoard', {
        gameMinutes: 10,
        incrementSeconds: 0,
        botEnabled: false,
      })
    })

    const vsBotBtn = this.add.text(170, 470, '▸  vs Bot', {
      fontFamily: 'primary',
      fontSize: FONT_SIZES.sm,
      color: COLORS.primary.text,
      stroke: COLORS.primary.textStroke,
      strokeThickness: 6,
      align: 'left',
    })
    vsBotBtn.setOrigin(0, 0.5)
    vsBotBtn.setInteractive({ useHandCursor: true })
    vsBotBtn.on('pointerdown', () => this.showBotSetup())

    this.modeGroup = [twoPlayersBtn, vsBotBtn]

    // --- Bot setup view (hidden initially) ---
    this.difficultySelector = new DifficultySelector(this, {
      x: 384,
      y: 330,
    })
    this.difficultySelector.setVisible(false)

    this.colorSelector = new ColorSelector(this, {
      x: 384,
      y: 440,
    })
    this.colorSelector.setVisible(false)

    const playBtn = this.add.text(384, 530, 'Play', {
      fontFamily: 'primary',
      fontSize: FONT_SIZES.sm,
      color: COLORS.primary.text,
      stroke: COLORS.primary.textStroke,
      strokeThickness: 6,
      align: 'center',
    })
    playBtn.setOrigin(0.5)
    playBtn.setInteractive({ useHandCursor: true })
    playBtn.setVisible(false)
    playBtn.on('pointerdown', () => {
      const level = this.difficultySelector?.getLevel() ?? 2
      const label = LEVELS.find(l => l.level === level)?.label ?? 'Bot'
      const playerColor = this.colorSelector?.getColor() ?? 'random'
      this.scene.start('ChessBoard', {
        gameMinutes: 10,
        incrementSeconds: 0,
        botEnabled: true,
        botLevel: level,
        playerColor,
        whitePlayer: 'You',
        blackPlayer: `Bot (${label})`,
      })
    })

    const backBtn = this.add.text(384, 600, '< Back', {
      fontFamily: 'primary',
      fontSize: FONT_SIZES.xs,
      color: COLORS.primary.text,
      stroke: COLORS.primary.textStroke,
      strokeThickness: 4,
      align: 'center',
    })
    backBtn.setOrigin(0.5)
    backBtn.setInteractive({ useHandCursor: true })
    backBtn.setVisible(false)
    backBtn.on('pointerdown', () => this.showModeSelection())

    this.botSetupGroup = [this.difficultySelector, this.colorSelector, playBtn, backBtn]

    this.mainBackground = this.add.image(384, 384, 'background').setDepth(-1)
  }

  private showBotSetup() {
    for (const obj of this.modeGroup)
      obj.setVisible(false)
    for (const obj of this.botSetupGroup)
      obj.setVisible(true)
  }

  private showModeSelection() {
    for (const obj of this.botSetupGroup)
      obj.setVisible(false)
    for (const obj of this.modeGroup)
      obj.setVisible(true)
  }
}
