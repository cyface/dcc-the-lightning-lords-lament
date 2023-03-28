const deepcopy = require('deepcopy')

const Manifest = require('./manifest.js')
const Pack = require('./pack.js')

const manifest = new Manifest.Manifest('module.json')

function processActor (packData, doc) {
  doc = deepcopy(doc)

  doc.token.displayName = 20
  doc.token.displayBars = 20
  doc.token.bar1 = {
    attribute: 'attributes.hp'
  }
  doc.token.bar2 = { }

  return doc
}

// Iterate and update all Actor entities
for (const pack of manifest.getEntityPacks('Actor')) {
  // Process the entities from this pack
  const p = new Pack.Pack(pack)
  p.processDocuments(function (packData, doc) {
    return processActor(packData, doc)
  })
}
