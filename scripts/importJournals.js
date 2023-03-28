const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const deepcopy = require('deepcopy')

const slugify = require('./slugify.js')
const Manifest = require('./manifest.js')
const Pack = require('./pack.js')

const manifest = new Manifest.Manifest('module.json')

const spellMetadataPath = './metadata/spells'

const spellPackPattern = /^dcc-core-spells-.*/
const spellJournalsPackName = 'dcc-core-spell-journals'

const resultsTablePattern = /(?:<br>)?<p><strong>Results:<\/strong> .*<\/p>/gm
const manifestationTablePattern = /(?:<br>)?<p><strong>Manifestations?:<\/strong> .*<\/p>/gm
const misfireTablePattern = /(?:<br>)?<p><strong>Misfire:<\/strong> .*<\/p>/gm
const corruptionTablePattern = /(?:<br>)?<p><strong>Corruption:<\/strong> .*<\/p>/gm
const spellJournalPattern = /(?:<br>)?<p><strong>Spell Data:<\/strong> .*<\/p>/gm

function formatLink (linkData) {
  return `@Compendium[${manifest.name}.${linkData.packData.name}.${linkData.table.name}]{${linkData.table.name}}`
}

function formatField (name, value) {
  return `<p><strong>${name}:</strong> ${value}</p>`
}

// Format a spell description for the item sheet
function formatSpellItemDescription (description, doc, links) {
  let output = ''

  output += description

  if (links.journal) {
    output += '<br>'
    output += formatField('Spell Data', formatLink(links.journal))
  }

  return output
}

// Format a spell description for a rolltable
function formatSpellRollTableDescription (description, doc, links) {
  let output = `<h1>${doc.name}</h1>`

  output += formatField('Level', doc.data.level)
  output += formatField('Range', doc.data.range)
  output += formatField('Duration', doc.data.duration)
  output += formatField('Casting Time', doc.data.castingTime)
  output += formatField('Save', doc.data.save)
  output += formatField('Page', doc.data.page)

  output += '<br>'

  output += description

  if (links.journal) {
    output += '<br>'
    output += formatField('Spell Data', formatLink(links.journal))
  }

  return output
}

const tableRegistry = {}

async function populateTableRegistry () {
  // Iterate RollTables and index by name
  for (const pack of manifest.getEntityPacks('RollTable')) {
    // Process the tables from this pack
    const p = new Pack.Pack(pack)
    await p.processDocuments(function (packData, doc) {
      // Register the table
      const tableSlug = slugify(doc.name)
      tableRegistry[tableSlug] = {
        table: doc,
        packObject: p,
        packData
      }

      // No change
      return doc
    })
  }
}

let tableJournalsPack = null
const journalRegistry = {}

async function loadSpellTableJournals () {
  // Load the pack for spell table journals
  tableJournalsPack = new Pack.Pack(manifest.packs.find(entry => entry.name === spellJournalsPackName))

  // Preload the journals from this pack (because we need them later in a non-async context)
  await tableJournalsPack.processDocuments(function (packData, doc) {
    // Register the journal
    createJournalHeader(doc)

    // No change to the document
    return doc
  })
}

// Find a journalised table, based on the table's name
function findJournal (name) {
  const slug = slugify(name)
  return journalRegistry[slug]
}

// Create a header for a journalised table that exists or is about to exist
function createJournalHeader (doc) {
  const slug = slugify(doc.name)

  journalRegistry[slug] = {
    table: doc,
    packObject: tableJournalsPack,
    packData: tableJournalsPack.pack
  }
}

// Format a RollTable entity as a JournalEntry compatible HTML table
function formatHTMLTable (table, heading = 'Result') {
  // Generate table header
  let html = `<table border="1" cellspacing="0">
<colgroup width="34"></colgroup> 
<colgroup width="365"></colgroup>
<tbody>
<tr>
<td align="left" height="17"><strong>[[/roll ${table.formula}]]</strong></td>
<td align="left"><strong>${heading}</td>
</tr>`

  // Table results
  let resultIndex = 0
  const lastResult = table.results.length - 1
  for (const result of table.results) {
    let min = result.range[0]
    const max = result.range[1]

    // Clamp the range to start at 1
    if (min <= 0) { min = 1 }

    // Select appropriate formatting for the row
    let range = `${min} - ${max}`
    if (resultIndex === lastResult && min !== max) {
      // XX+ formatting for spell result tables (last entry and range > 1)
      range = `${min}+`
    } else if (min === max) {
      // Just show a single value if range is 1
      range = `${min}`
    }

    // TODO: Do we need to handle compendium references or is this good enough for our usage?
    const resultHTML = result.text

    // Generate HTML
    html += `<tr>
<td align="left" height="17">${range}</td>
<td align="left">${resultHTML}</td>
</tr>`

    // Count results
    ++resultIndex
  }

  // Table footer
  html += '</tbody></table>'

  return html
}

// Format a spell description for a journal entry
function formatSpellJournalDescription (description, doc, table, links) {
  let output = `<h1>${doc.name}</h1>`

  output += formatField('Level', doc.data.level)
  output += formatField('Range', doc.data.range)
  output += formatField('Duration', doc.data.duration)
  output += formatField('Casting Time', doc.data.castingTime)
  output += formatField('Save', doc.data.save)
  output += formatField('Page', doc.data.page)

  output += '<br>'

  output += description

  if (links.manifestation) {
    output += '<br>'
    output += formatField('Manifestation', formatLink(links.manifestation))
    output += '<br>'
    output += formatHTMLTable(links.manifestation.table, 'Manifestation')
  }
  if (links.misfire) {
    output += '<br>'
    output += formatField('Misfire', formatLink(links.misfire))
    output += '<br>'
    output += formatHTMLTable(links.misfire.table, 'Misfire')
  }
  if (links.corruption) {
    output += '<br>'
    output += formatField('Corruption', formatLink(links.corruption))
    output += '<br>'
    output += formatHTMLTable(links.corruption.table, 'Corruption')
  }

  if (links.results) {
    output += '<br>'
    output += formatField('Results', formatLink(links.results))
    output += '<br>'
    output += formatHTMLTable(links.results.table, 'Spell Result')
  }

  return output
}

function createTableJournalEntry (doc, table, links) {
  if (!tableJournalsPack) { return }

  // Generate the Journal's contents
  const journalContent = formatSpellJournalDescription(doc.data.description.value, doc, table, links)

  // Check for an existing entry
  const journalEntry = findJournal(doc.name)
  let journalDoc = journalEntry ? journalEntry.table : null

  // Update journalDoc document or create a new one
  if (journalDoc) {
    tableJournalsPack.db.update({ _id: journalDoc._id }, {
      $set: {
        content: journalContent,
        img: doc.img
      }
    }, (err, numReplaced) => {
      if (err) { return }
      if (numReplaced > 0) {
        console.log(`Updated spell Journal ${journalDoc.name} (${journalDoc._id}).`)
      }
    })
  } else {
    journalDoc = {
      name: doc.name,
      sort: 100001,
      content: journalContent,
      img: doc.img
    }
    tableJournalsPack.db.insert(journalDoc, (err, newDoc) => {
      if (err) { return }
      if (newDoc) {
        console.log(`Created spell Journal ${newDoc.name} (${newDoc._id}).`)
        journalDoc = newDoc
      }
    })

    // Create a header for the journal entry so the links can be created immediately
    createJournalHeader(journalDoc)
  }
}

// Strip out the fields we add to a spell description
function stripSpellDescription (description) {
  description = description.replace(resultsTablePattern, '')
  description = description.replace(manifestationTablePattern, '')
  description = description.replace(misfireTablePattern, '')
  description = description.replace(corruptionTablePattern, '')
  description = description.replace(spellJournalPattern, '')
  return description.trim()
}

// Find any tables that a spell should link to, based on their names
function findLinks (name) {
  const slug = slugify(name)

  const links = {
    results: tableRegistry[slug],
    manifestation: tableRegistry[slug + '-manifestation'],
    misfire: tableRegistry[slug + '-misfire'],
    corruption: tableRegistry[slug + '-corruption']
  }

  return links
}

// Edit a spell based on imported data
function importSpell (packDir, doc) {
  const filename = path.join(packDir, slugify(doc.name) + '.yaml')

  // Don't corrupt the caller's document - we need it intact to detect changes
  doc = deepcopy(doc)

  // Strip id and legacy data from the document
  delete doc._id
  delete doc.data.corruption
  delete doc.data.manifestation
  delete doc.data.misfire
  doc.data.description.value = stripSpellDescription(doc.data.description.value)

  // Read in the YAML file for the spell
  const spellData = yaml.load(fs.readFileSync(filename, 'utf8'))
  Object.assign(doc, spellData)

  // Find any tables we should link
  const links = findLinks(doc.name)

  const replaced = function (err, numReplaced) {
    if (!err) {
      console.log('Replaced ', numReplaced, ': ', doc.name, ' (', doc._id, ')')
    }
  }

  // Link the results table if present
  if (links.results) {
    doc.data.results = {
      table: links.results.table.name,
      collection: manifest.name + '.' + links.results.packData.name
    }

    // Create a Journal entry for the spell's results table and add link data for it
    createTableJournalEntry(doc, links.results.table, links)
    links.journal = findJournal(doc.name)

    // Update the results table's description and image based on the item description and image
    const table = links.results.table
    const tableDescription = formatSpellRollTableDescription(doc.data.description.value, doc, links)
    links.results.packObject.db.update({ _id: table._id }, {
      $set: {
        description: tableDescription,
        img: doc.img
      }
    }, replaced)
  }

  // Update the images of the manifestation, misfire, and corruption tables to match
  if (links.manifestation) {
    const table = links.manifestation.table
    links.manifestation.packObject.db.update({ _id: table._id }, { $set: { img: doc.img } }, replaced)
  }
  if (links.misfire) {
    const table = links.misfire.table
    links.misfire.packObject.db.update({ _id: table._id }, { $set: { img: doc.img } }, replaced)
  }
  if (links.corruption) {
    const table = links.corruption.table
    links.corruption.packObject.db.update({ _id: table._id }, { $set: { img: doc.img } }, replaced)
  }

  // Update the spell description
  doc.data.description.value = formatSpellItemDescription(doc.data.description.value, doc, links)

  return doc
}

// Iterate and import the spell items
async function importSpells () {
  // Synchronously query the table registry so it's ready for spell import
  await populateTableRegistry()

  // Load the spell table journals pack
  await loadSpellTableJournals()

  for (const pack of manifest.getEntityPacks('Item')) {
    if (pack.name.match(spellPackPattern)) {
      // Find the folder for spell metadata
      const packDir = path.join(spellMetadataPath, pack.name)

      // Process the spells from this pack
      const p = new Pack.Pack(pack)
      await p.processDocuments(function (packData, doc) {
        // Read in the new data from disk
        const newDoc = importSpell(packDir, doc)

        // Write to the database
        return newDoc
      })
      await p.compact()
    }
  }
}

importSpells()
