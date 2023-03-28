const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const deepcopy = require('deepcopy')

const slugify = require('./slugify.js')
const Manifest = require('./manifest.js')
const Pack = require('./pack.js')

const manifest = new Manifest.Manifest('module.json')

const journalRegistry = {}

async function populateJournalRegistry () {
  // Iterate Journals and index by name
  for (const pack of manifest.getEntityPacks('JournalEntry')) {
    // Process the entries from this pack
    const p = new Pack.Pack(pack)
    await p.processDocuments(function (packData, doc) {
      // Register the journal
      const journalSlug = slugify(doc.name)
      journalRegistry[journalSlug] = {
        journal: doc,
        packObject: p,
        packData
      }

      // No change
      return doc
    })
  }

  console.log("Populated journal registry.")
}

var passed = true

// Find a journal by name
function findJournal (name) {
  const slug = slugify(name)
  return journalRegistry[slug]
}

function validateScene (packData, doc) {
  console.log("Processing scene", doc.name, "(", doc._id, ")")
  for (const note of doc.notes) {
    const id = note._id
    const entryId = note.entryId
    const journalName = note?.flags?.dcc?.journalName
    if (!journalName)
    {
      console.log("ERROR: No journalName flag for note", id, "with original entry ID", entryId)
      passed = false
      continue
    }
    const journal = findJournal(journalName)
    if (!journal)
    {
      console.log("ERROR: No journal found for note", id, "with journalName", journalName)
      passed = false
      continue;
    }
    console.log("JournalNote", id, "references journal", journalName)
  }

  // No change
  return doc
}

// Iterate and validate all Journal Notes in scenes
async function validateJournalNotes () {
  // Populate a list of all journals in any pack to validate against
  await populateJournalRegistry()

  // Assume success
  passed = true

  // Iterate all scenes
  for (const pack of manifest.getEntityPacks('Scene')) {
    const p = new Pack.Pack(pack)
    // Process each scene
    await p.processDocuments(validateScene);
  }

  // Report results
  if (!passed)
  {
    console.log("ERROR: One or more JournalNotes failed validation!")
    process.exitCode = 127
  }
  else
  {
    console.log("SUCCESS: All JournalNotes passed validation.")
  }
}

validateJournalNotes()
