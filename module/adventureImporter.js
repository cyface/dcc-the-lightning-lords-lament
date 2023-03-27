/* global duplicate, expandObject, flattenObject, Folder, FormApplication, game, NotesLayer */

class AdventureImporter {
  constructor (options = {}) {
    this._pack = options.pack
    this._enableNotes = options.enableNotes
  }

  /**
   * Trigger the adventure importer
   * @private
   */
  async importAdventure () {
    // Get the requested pack and try importing any entries
    // This class is intended for packs with a single entry
    const pack = await game.packs.get(this._pack)
    if (pack) {
      const documents = await pack.getDocuments()
      for (let document of documents) {
        const sheet = document.sheet
        if (sheet._minimized) {
          return sheet.maximize()
        } else {
          return sheet.render(true, { editable: game.user.isGM && !pack.locked })
        }
      }
    }

    // If requested enable the Notes layer
    // This is a client side setting so only the GM user is affected
    if (this_enableNotes) {
      game.settings.set('core', NotesLayer.TOGGLE_SETTING, true)
    }
  }
}

export default AdventureImporter
