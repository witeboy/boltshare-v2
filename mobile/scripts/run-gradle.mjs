import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const android = resolve('android')
const gradle = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
const result = spawnSync(gradle, process.argv.slice(2), {
  cwd: android,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

process.exit(result.status ?? 1)
