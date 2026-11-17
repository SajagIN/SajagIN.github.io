// Copy shared public files for the Vite dev server and static preview.
// The repository-root files remain the source of truth.
import { cp, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const website = new URL('../', import.meta.url)
const root = new URL('../../', import.meta.url)
await mkdir(new URL('public/', website), { recursive: true })
await cp(new URL('assets/', root), new URL('public/assets/', website), { recursive: true, force: true })
for (const file of ['Resume.pdf', 'manifest.json']) {
  await cp(new URL(file, root), new URL(`public/${file}`, website), { force: true })
}
console.log(`Shared files synchronized to ${fileURLToPath(new URL('public/', website))}`)
