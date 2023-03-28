const Manifest = require('./manifest.js')

console.log('Compacting packs...')

const m = new Manifest.Manifest('module.json')
m.compactPacks()
