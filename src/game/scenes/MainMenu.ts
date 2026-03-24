import type { GameObjects } from 'phaser'
import { Scene } from 'phaser'
import {
  COLORS,
  FONT_SIZES,
} from '@/config/ui'
import { Button } from '@/game/elements/Button'
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
    this.mainBackground = this.add.image(0, 0, 'menu-background')
      .setOrigin(0, 0)
      .setDepth(-1)
    this.fitBackgroundToViewport()

    this.scale.on('resize', this.fitBackgroundToViewport, this)
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.fitBackgroundToViewport, this)
    })

    this.title = this.add.text(384, 200, 'PixChess', {
      fontFamily: 'primary',
      fontSize: FONT_SIZES.xl,
      color: COLORS.primary.text,
      stroke: COLORS.primary.textStroke,
      strokeThickness: 10,
      align: 'center',
    }).setOrigin(0.5)

    // --- Mode selection view ---
    const twoPlayersBtn = new Button(this, {
      x: 170,
      y: 470,
      label: '▸  2 Players',
      fontSize: FONT_SIZES.sm,
      align: 'left',
      originX: 0,
      onClick: () => {
        this.scene.start('ChessBoard', {
          gameMinutes: 10,
          incrementSeconds: 0,
          botEnabled: false,
        })
      },
    })

    const vsBotBtn = new Button(this, {
      x: 170,
      y: 400,
      label: '▸  vs Bot',
      fontSize: FONT_SIZES.sm,
      align: 'left',
      originX: 0,
      onClick: () => this.showBotSetup(),
    })

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

    const playBtn = new Button(this, {
      x: 384,
      y: 530,
      label: 'Play',
      fontSize: FONT_SIZES.sm,
      visible: false,
      onClick: () => {
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
      },
    })

    const backBtn = new Button(this, {
      x: 384,
      y: 600,
      label: '< Back',
      fontSize: FONT_SIZES.xs,
      strokeThickness: 4,
      visible: false,
      onClick: () => this.showModeSelection(),
    })

    this.botSetupGroup = [this.difficultySelector, this.colorSelector, playBtn, backBtn]
  }

  private fitBackgroundToViewport() {
    if (!this.mainBackground) {
      return
    }

    const width = this.cameras.main.width
    const height = this.cameras.main.height

    this.mainBackground
      .setPosition(0, 0)
      .setDisplaySize(width, height)
  }

  private showBotSetup() {
    this.mainBackground.setTexture('background')

    for (const obj of this.modeGroup)
      obj.setVisible(false)
    for (const obj of this.botSetupGroup)
      obj.setVisible(true)
  }

  private showModeSelection() {
    this.mainBackground.setTexture('menu-background')

    for (const obj of this.botSetupGroup)
      obj.setVisible(false)
    for (const obj of this.modeGroup)
      obj.setVisible(true)
  }
}
