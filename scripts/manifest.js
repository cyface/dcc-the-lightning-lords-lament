const fs = require('fs')
const Pack = require('./pack.js')

class Manifest {
  constructor (filename) {
    const doc = fs.readFileSync(filename)
    this.manifest = JSON.parse(doc)
  }

  get name () {
    return this.manifest.name
  }

  get packs () {
    return this.manifest.packs
  }

  getEntityPacks (entity) {
    const packs = []
    for (const pack of this.packs) {
      if (pack.entity === entity) {
        packs.push(pack)
      }
    }
    return packs
  }

  compactPacks () {
    for (const pack of this.packs) {
      const p = new Pack.Pack(pack)
      p.compact()
    }
  }
}

exports.Manifest = Manifest
