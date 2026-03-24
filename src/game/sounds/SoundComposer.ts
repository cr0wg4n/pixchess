import type { Scene } from 'phaser'

enum SfxEvent {
  ChessMove = 'ChessMove',
  ChessCapture = 'ChessCapture',
  ChessThreat = 'ChessThreat',
  ChessEnd = 'ChessEnd',
  MenuClick = 'MenuClick',
}

interface SfxDefinition {
  key: string
  assetPath: string
  defaultVolume: number
}

const SFX_DEFINITIONS: Record<SfxEvent, SfxDefinition> = {
  [SfxEvent.ChessMove]: {
    key: 'sfx-chess-move',
    assetPath: 'assets/sounds/single_move.mp3',
    defaultVolume: 0.5,
  },
  [SfxEvent.ChessCapture]: {
    key: 'sfx-chess-capture',
    assetPath: 'assets/sounds/win_piece.mp3',
    defaultVolume: 0.6,
  },
  [SfxEvent.ChessThreat]: {
    key: 'sfx-chess-threat',
    assetPath: 'assets/sounds/thunder.mp3',
    defaultVolume: 0.55,
  },
  [SfxEvent.ChessEnd]: {
    key: 'sfx-chess-end',
    assetPath: 'assets/sounds/loose_piece.mp3',
    defaultVolume: 0.65,
  },
  [SfxEvent.MenuClick]: {
    key: 'sfx-menu-click',
    assetPath: 'assets/sounds/menu_click.mp3',
    defaultVolume: 0.45,
  },
}

const MASTER_VOLUME_STORAGE_KEY = 'pixchess:sfx:master-volume'
const DEFAULT_MASTER_VOLUME = 1

function clampVolume(value: number) {
  if (Number.isNaN(value)) {
    return DEFAULT_MASTER_VOLUME
  }

  return Math.min(1, Math.max(0, value))
}

function getStoredMasterVolume() {
  if (typeof window === 'undefined') {
    return DEFAULT_MASTER_VOLUME
  }

  const rawValue = window.localStorage.getItem(MASTER_VOLUME_STORAGE_KEY)

  if (!rawValue) {
    return DEFAULT_MASTER_VOLUME
  }

  const parsedValue = Number.parseFloat(rawValue)

  return clampVolume(parsedValue)
}

function setStoredMasterVolume(volume: number) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(MASTER_VOLUME_STORAGE_KEY, String(clampVolume(volume)))
}

class SoundVolumeController {
  getMasterVolume() {
    return getStoredMasterVolume()
  }

  setMasterVolume(volume: number) {
    setStoredMasterVolume(volume)
  }

  increase(step = 0.1) {
    const nextVolume = clampVolume(this.getMasterVolume() + step)

    this.setMasterVolume(nextVolume)

    return nextVolume
  }

  decrease(step = 0.1) {
    const nextVolume = clampVolume(this.getMasterVolume() - step)

    this.setMasterVolume(nextVolume)

    return nextVolume
  }

  isMuted() {
    return this.getMasterVolume() <= 0
  }

  setMuted(muted: boolean) {
    if (muted) {
      this.setMasterVolume(0)
      return 0
    }

    const fallbackVolume = this.getMasterVolume() > 0 ? this.getMasterVolume() : DEFAULT_MASTER_VOLUME

    this.setMasterVolume(fallbackVolume)

    return fallbackVolume
  }
}

interface PlaySfxOptions {
  volume?: number
}

const soundVolumeController = new SoundVolumeController()

class SoundComposer {
  private readonly scene: Scene

  constructor(scene: Scene) {
    this.scene = scene
  }

  play(event: SfxEvent, options: PlaySfxOptions = {}) {
    const definition = SFX_DEFINITIONS[event]

    if (!this.scene.sound || !this.scene.cache.audio.exists(definition.key)) {
      return false
    }

    const baseVolume = typeof options.volume === 'number' ? options.volume : definition.defaultVolume
    const finalVolume = clampVolume(baseVolume * soundVolumeController.getMasterVolume())

    this.scene.sound.play(definition.key, {
      volume: finalVolume,
    })

    return true
  }
}

function preloadSfxAssets(scene: Scene) {
  for (const definition of Object.values(SFX_DEFINITIONS)) {
    scene.load.audio(definition.key, definition.assetPath)
  }
}

export {
  preloadSfxAssets,
  SfxEvent,
  SoundComposer,
  soundVolumeController,
}
