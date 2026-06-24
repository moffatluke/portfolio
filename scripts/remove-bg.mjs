// One-off: flood-fill the baked-in white background to transparent,
// seeding from the image edges so the white shirt survives.
import { Jimp } from 'jimp'

const SRC = './src/assets/luke-cutout.png'
const DST = './src/assets/luke-cutout-nobg.png'
const TOLERANCE = 30

const img = await Jimp.read(SRC)
const { width: w, height: h, data } = img.bitmap

const visited = new Uint8Array(w * h)
const queue = []

const isBg = (x, y) => {
  const i = (y * w + x) * 4
  return (
    data[i] >= 255 - TOLERANCE &&
    data[i + 1] >= 255 - TOLERANCE &&
    data[i + 2] >= 255 - TOLERANCE
  )
}

const tryAdd = (x, y) => {
  if (x < 0 || x >= w || y < 0 || y >= h) return
  const p = y * w + x
  if (visited[p]) return
  visited[p] = 1
  if (isBg(x, y)) queue.push(x, y)
}

for (let x = 0; x < w; x++) {
  tryAdd(x, 0)
  tryAdd(x, h - 1)
}
for (let y = 0; y < h; y++) {
  tryAdd(0, y)
  tryAdd(w - 1, y)
}

let qi = 0
while (qi < queue.length) {
  const x = queue[qi++]
  const y = queue[qi++]
  data[(y * w + x) * 4 + 3] = 0
  tryAdd(x - 1, y)
  tryAdd(x + 1, y)
  tryAdd(x, y - 1)
  tryAdd(x, y + 1)
}

await img.write(DST)
console.log('Done:', DST)
