import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const sourcePath = path.join(projectRoot, 'public', 'social972-mark.svg')
const socialCardSourcePath = path.join(projectRoot, 'public', 'social972-share.svg')
const iconsDir = path.join(projectRoot, 'public', 'icons')
const socialCardOutputPath = path.join(projectRoot, 'public', 'social-card.png')

async function main() {
  const source = await fs.readFile(sourcePath)

  await fs.mkdir(iconsDir, { recursive: true })

  await sharp(source).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'))
  await sharp(source).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'))
  await sharp(source).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-maskable-512.png'))
  await sharp(await fs.readFile(socialCardSourcePath))
    .resize(1200, 630)
    .png()
    .toFile(socialCardOutputPath)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
