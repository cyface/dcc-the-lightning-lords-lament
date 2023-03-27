/* global game, Hooks, TextEditor, Handlebars */

import { registerModuleSettings, pubConstants } from './settings.js'
import WelcomeDialog from './welcomeDialog.js'
import AdventureImporter from './adventureImporter.js'

Hooks.once('ready', async function () {
  // Register module settings
  await registerModuleSettings()

  // Load indexes for all of our packs so links work correctly
  for (const pack of game.packs) {
    if (pack.metadata.packageName === pubConstants.name) {
      await pack.getIndex()
      console.log(`Loaded index for ${pack.metadata.id}.`)
    }
  }

  // Show welcome dialog if enabled
  if (game.user.isGM && game.settings.get(pubConstants.name, 'showWelcomeDialog')) {
    new WelcomeDialog({
      importContentHook: _importContent
    }).render(true)
  }
})

async function _importContent () {
  const importer = new AdventureImporter({
    pack: `${pubConstants.name}.${pubConstants.adventurePack}`,
    enableNotes: true,
  })
  return importer.importAdventure();
}
