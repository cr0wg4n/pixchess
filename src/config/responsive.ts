interface ChessboardResponsiveMetricsInput {
  baseTileSize: number
  boardSize: number
  contentPaddingDesktop: number
  contentPaddingMobile: number
  maxTileSize: number
  menuButtonSpaceDesktop: number
  menuButtonSpaceMobile: number
  minTileSize: number
  mobileBreakpoint: number
  mobileTileUpscale: number
  profileHeight: number
  profileMarginDesktop: number
  profileMarginMobile: number
  sceneHeight: number
  sceneWidth: number
  viewportHeight: number
  viewportWidth: number
}

interface ChessboardResponsiveMetrics {
  offsetX: number
  offsetY: number
  profileMargin: number
  size: number
  tileSize: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function computeChessboardResponsiveMetrics(
  input: ChessboardResponsiveMetricsInput,
): ChessboardResponsiveMetrics {
  const isMobileViewport = input.viewportWidth <= input.mobileBreakpoint
    || input.viewportHeight <= input.mobileBreakpoint
  const contentPadding = isMobileViewport
    ? input.contentPaddingMobile
    : input.contentPaddingDesktop
  const profileMargin = isMobileViewport
    ? input.profileMarginMobile
    : input.profileMarginDesktop
  const menuButtonSpace = isMobileViewport
    ? input.menuButtonSpaceMobile
    : input.menuButtonSpaceDesktop
  const topReserved = input.profileHeight + profileMargin + menuButtonSpace / 2
  const bottomReserved = input.profileHeight + profileMargin + menuButtonSpace / 2
  const maxBoardWidth = input.sceneWidth - contentPadding * 2
  const maxBoardHeight = input.sceneHeight - topReserved - bottomReserved - contentPadding * 2
  const baseTileSize = isMobileViewport
    ? Math.floor(Math.min(maxBoardWidth, maxBoardHeight) / input.boardSize)
    : input.baseTileSize
  const targetTileSize = isMobileViewport
    ? Math.floor(baseTileSize * input.mobileTileUpscale)
    : input.baseTileSize
  const maxTileByWidth = Math.floor(maxBoardWidth / input.boardSize)
  const heightCapSpace = isMobileViewport
    ? maxBoardHeight + profileMargin + menuButtonSpace
    : maxBoardHeight
  const maxTileByHeight = Math.floor(heightCapSpace / input.boardSize)
  const maxTileByViewport = Math.max(1, Math.min(maxTileByWidth, maxTileByHeight))
  const tileSize = clamp(
    targetTileSize || input.baseTileSize,
    input.minTileSize,
    Math.min(input.maxTileSize, maxTileByViewport),
  )
  const size = input.boardSize * tileSize
  const availableVertical = input.sceneHeight - (topReserved + bottomReserved + contentPadding * 2)
  const verticalInset = (availableVertical - size) / 2

  return {
    size,
    offsetX: (input.sceneWidth - size) / 2,
    offsetY: contentPadding + topReserved + verticalInset,
    tileSize,
    profileMargin,
  }
}

export {
  computeChessboardResponsiveMetrics,
}

export type {
  ChessboardResponsiveMetrics,
  ChessboardResponsiveMetricsInput,
}
