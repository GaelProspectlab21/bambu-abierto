const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

module.exports = async function shareAuthChecks() {
  const values = new Map()
  const previous = { localStorage: global.localStorage, indexedDB: global.indexedDB }
  const warn = console.warn
  global.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) }
  global.indexedDB = { open() { throw new Error('Storage fallback test') } }
  console.warn = () => {}
  const load = name => {
    let source = fs.readFileSync(path.join(__dirname, '../src/lib', name + '.ts'), 'utf8')
    if (process.env.SHARE_AUTH_MUTATION === '1' && name === 'storage') source = source.replace('`bambu.app.v3.${storageScope}`', "'bambu.app.v3.shared'")
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const exports = {}
    new Function('require', 'exports', code)(name => name === './model' ? { EMPTY_DATA: { profile: { name: '' } }, normalizeData: x => x } : name === './storage' ? { getLocalOwnerId: async () => values.get('bambu.cloud-owner.v1') ?? null } : { newerState: () => null }, exports)
    return exports
  }
  try {
    const storage = load('storage')
    values.set('bambu.cloud-owner.v1', 'account-a')
    values.set('bambu.app.v2', JSON.stringify({ profile: { name: 'legacy-a' } }))
    storage.setStorageScope('local')
    assert.equal((await storage.loadAppData()).data.profile.name, '', 'Local must not adopt another account')
    storage.setStorageScope('account-a')
    assert.equal((await storage.loadAppData()).data.profile.name, 'legacy-a', 'Legacy stays with its recorded owner')
    await storage.saveAppData({ profile: { name: 'private-a' } })
    storage.setStorageScope('account-b')
    await storage.setLocalOwnerId('account-b')
    assert.equal((await storage.loadAppData()).data.profile.name, '', 'B cannot read A')
    await storage.saveAppData({ profile: { name: 'private-b' } })
    storage.setStorageScope('account-a')
    assert.equal((await storage.loadAppData()).data.profile.name, 'private-a', 'A survives account switches')
    storage.setStorageScope('local')
    assert.equal((await storage.loadAppData()).data.profile.name, '', 'Local remains separate after sign-out')
    const photos = load('photos')
    values.set('bambu.cloud-owner.v1', 'account-a')
    const opened = []
    global.indexedDB = { open(name) { opened.push(name); throw new Error('Capture name') } }
    for (const owner of ['account-a', 'account-b', 'local']) { await photos.setPhotoOwner(owner); await photos.listPhotos().catch(() => {}) }
    assert.deepEqual(opened, ['bambu-photos', 'bambu-photos-account-b', 'bambu-photos-local'])
    console.log('PASS compartir auth: legacy owner, two accounts, local mode and photo isolation')
  } finally {
    global.localStorage = previous.localStorage
    global.indexedDB = previous.indexedDB
    console.warn = warn
  }
}
if (require.main === module) module.exports().catch(error => { console.error(error); process.exitCode = 1 })
