/**
 * Generates Yahrah's PWA icons as PNGs from an original pixel-art grid.
 * No image library, no external asset: the glyph is defined here as a
 * character grid and encoded to PNG by hand.
 *
 * The glyph is a woven knot - four threads crossing over a central eye -
 * standing for the Ori, the Weave that binds the seven villages.
 *
 * Run: node scripts/gen-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const PALETTE = {
  '.': [14, 19, 25, 255], // ink background
  '#': [61, 80, 104, 255], // thread shadow
  'o': [90, 169, 232, 255], // Aoyane blue thread
  'r': [232, 97, 90, 255], // Akazora red thread
  'p': [176, 122, 232, 255], // Fujizome violet thread
  'w': [232, 228, 216, 255], // paper highlight
  'y': [232, 195, 90, 255], // the eye
}

/**
 * The glyph is computed rather than hand-placed, so it is exactly
 * four-fold symmetric: two threads crossing (Aoyane blue north-west to
 * south-east, Akazora red north-east to south-west), bound by a Fujizome
 * violet knot-ring, with the warden's eye at the centre.
 */
const SIZE = 16
const C = (SIZE - 1) / 2 // 7.5, the true centre

function glyphAt(x, y) {
  const dx = x - C
  const dy = y - C
  const diamond = Math.abs(dx) + Math.abs(dy)

  // The warden's eye.
  if (diamond <= 1.5) return 'y'
  // The knot-ring binding the threads.
  if (diamond >= 4.0 && diamond <= 5.2) return 'p'

  const onNwSe = Math.abs(dx - dy) <= 1.6
  const onNeSw = Math.abs(dx + dy) <= 1.6
  const reach = Math.max(Math.abs(dx), Math.abs(dy))
  if (reach > 7.2) return '.'

  // Threads run from the ring outward; highlight their outer tips.
  if (onNwSe) return reach >= 6.0 ? 'w' : 'o'
  if (onNeSw) return reach >= 6.0 ? 'w' : 'r'
  // A shadow halo just off each thread gives the pixels some weight.
  if (Math.abs(Math.abs(dx - dy) - 2.4) <= 0.9 || Math.abs(Math.abs(dx + dy) - 2.4) <= 0.9) {
    return '#'
  }
  return '.'
}

const GLYPH = Array.from({ length: SIZE }, (_, y) =>
  Array.from({ length: SIZE }, (_, x) => glyphAt(x, y)).join(''),
)

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** Encode RGBA pixel rows to a PNG buffer. */
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // One filter byte (0 = none) per scanline.
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Nearest-neighbour upscale of the glyph, keeping edges crisp. */
function renderGlyph(size) {
  const src = SIZE
  if (size % src !== 0) throw new Error(`size ${size} must be a multiple of ${src}`)
  const scale = size / src
  const rgba = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ch = GLYPH[Math.floor(y / scale)][Math.floor(x / scale)]
      const [r, g, b, a] = PALETTE[ch] ?? PALETTE['.']
      const i = (y * size + x) * 4
      rgba[i] = r
      rgba[i + 1] = g
      rgba[i + 2] = b
      rgba[i + 3] = a
    }
  }
  return rgba
}

const outDir = join(import.meta.dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

for (const size of [192, 512]) {
  const png = encodePng(size, size, renderGlyph(size))
  writeFileSync(join(outDir, `icon-${size}.png`), png)
  console.log(`wrote public/icons/icon-${size}.png (${png.length} bytes)`)
}

// Favicon at 32px for browser tabs.
const fav = encodePng(32, 32, renderGlyph(32))
writeFileSync(join(outDir, 'icon-32.png'), fav)
console.log(`wrote public/icons/icon-32.png (${fav.length} bytes)`)
