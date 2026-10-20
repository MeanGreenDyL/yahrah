import type { Sprite } from '@/content/schemas'

/**
 * The crest of Yahrah: four threads bound at a warden's eye. Original art,
 * stored as a palette-indexed grid like every other sprite in the game.
 */
export const CREST: Sprite = {
  width: 16,
  height: 16,
  palette: {
    o: '#5aa9e8', // Aoyane thread
    r: '#e8615a', // Akazora thread
    p: '#b07ae8', // Fujizome knot
    y: '#e8c35a', // the eye
    w: '#e8e4d8', // highlight
    k: '#3d5068', // shadow
  },
  rows: [
    '................',
    '..ww........ww..',
    '..ok........ko..',
    '...ok......ko...',
    '....ok....ko....',
    '.....oppppo.....',
    '....ppkyykpp....',
    '...pp.yyyy.pp...',
    '...pp.yyyy.pp...',
    '....ppkyykpp....',
    '.....rppppr.....',
    '....rk....kr....',
    '...rk......kr...',
    '..rk........kr..',
    '..ww........ww..',
    '................',
  ],
}
