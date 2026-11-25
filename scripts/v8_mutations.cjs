// Deliberately break one rule, run the real checks, restore even on failure.
const fs = require('node:fs')
const { spawnSync } = require('node:child_process')
const assert = require('node:assert/strict')
const cases = {
  pause: ['src/lib/pauseHistory.ts', 'i - 13', 'i - 14'],
  oauth: ['src/lib/oauth.ts', "url.searchParams.has('error_description') || hash.has('error_description')", 'false'],
  progress: ['src/lib/healthyProgress.ts', 'day >= start && day <= today', 'true'],
  onboarding: ['src/lib/onboarding.ts', 'firstVotes: done ?', 'firstVotes: true ?'],
  sound: ['src/lib/sounds.ts', "preference === '1'", 'true'],
}
for (const name of process.argv.slice(2)) {
  const [file, before, after] = cases[name]
  const original = fs.readFileSync(file, 'utf8')
  assert.ok(original.includes(before), `Mutation anchor: ${name}`)
  try {
    fs.writeFileSync(file, original.replace(before, after))
    const result = spawnSync(process.execPath, ['checks/features.cjs'], { encoding: 'utf8' })
    assert.notEqual(result.status, 0, `Surviving mutation: ${name}`)
    assert.match(result.stderr, /AssertionError/, `Must fail an assertion: ${name}`)
    console.log(`Killed mutation: ${name}`)
  } finally { fs.writeFileSync(file, original) }
}
