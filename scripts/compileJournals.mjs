import { opendir } from 'fs/promises'
import { readFile } from 'fs/promises'
import { Manifest } from './manifest.js'
import { Pack } from './pack.js'
import slugify from 'slugify'

let journalsPack = null
let journalRegistry = {}

const manifest = new Manifest('module.json')

// Create a header for a journalized table that exists or is about to exist
function createJournalHeader (doc) {
  const slug = slugify(doc.name)

  journalRegistry[slug] = {
    table: doc,
    packObject: journalsPack,
    packData: journalsPack.pack
  }
  console.log(journalRegistry)
}

async function loadJournals () {
  // Load the pack for journals
  journalsPack = new Pack(manifest.packs.find(entry => entry.name === 'dcc-jewels-of-the-carnifex-text'))
  // Preload the journals from this pack (because we need them later in a non-async context)
  await journalsPack.processDocuments(function (packData, doc) {
    // Register the journal
    createJournalHeader(doc)
  })
}

function createJournalEntry (journalName, journalContent) {
  journalName = journalName.replace(".html", "")
  let journalDoc = {
    name: journalName,
    sort: 100001,
    content: journalContent
  }
  journalsPack.db.insert(journalDoc, (err, newDoc) => {
    if (err) { return }
    if (newDoc) {
      console.log(`Created Journal ${newDoc.name} (${newDoc._id}).`)
      journalDoc = newDoc
    }
  })

  // Create a header for the journal entry so the links can be created immediately
  createJournalHeader(journalDoc)
}

let textDirs = []

try {
  // Load existing journals
  await loadJournals()

  //Grab all the items in the assets/text Dir and sort their names
  const dir = await opendir('assets/text')
  for await (const ent of dir) {
    textDirs.push(ent.name)
  }
  textDirs.sort()

  // Loop over items and create Journal entries
  for (const dir of textDirs) {
    if (dir.includes('html')) {
      const fileData = await readFile(`assets/text/${dir}`, 'utf8')
      createJournalEntry(dir, fileData)
      continue
    }
    const subDir = await opendir(`assets/text/${dir}`)
    for await (const item of subDir) {
      const fileData = await readFile(`assets/text/${dir}/${item.name}`, 'utf8')
      createJournalEntry(item.name, fileData)
    }
  }
} catch
  (err) {
  console.error(err)
}
