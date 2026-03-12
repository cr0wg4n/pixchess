export enum PieceTextureKey {
  BLACK_BISHOP = 'black-bishop',
  BLACK_KING = 'black-king',
  BLACK_KNIGHT = 'black-knight',
  BLACK_PAWN = 'black-pawn',
  BLACK_QUEEN = 'black-queen',
  BLACK_ROOK = 'black-rook',
  WHITE_BISHOP = 'white-bishop',
  WHITE_KING = 'white-king',
  WHITE_KNIGHT = 'white-knight',
  WHITE_PAWN = 'white-pawn',
  WHITE_QUEEN = 'white-queen',
  WHITE_ROOK = 'white-rook',
}

export enum PieceColor {
  BLACK = 'black',
  WHITE = 'white',
}

export enum PieceType {
  BISHOP = 'bishop',
  KING = 'king',
  KNIGHT = 'knight',
  PAWN = 'pawn',
  QUEEN = 'queen',
  ROOK = 'rook',
}

export interface BoardCoordinate {
  row: number
  col: number
}

export interface PieceState {
  id: string
  color: PieceColor
  type: PieceType
  textureKey: PieceTextureKey
  position: BoardCoordinate
}
