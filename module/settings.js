/* global game */

export const pubConstants = {
  name: 'dcc-the-lightning-lords-lament',
  adventurePack: 'dcc-the-lightning-lords-lament-adventure',
  langRoot: 'DCC.TheLightningLordsLament',
  title: 'The Lightning Lord\'s Lament',
}

export const registerModuleSettings = async function () {
  game.settings.register(pubConstants.name, 'showWelcomeDialog', {
    name: `${pubConstants.langRoot}.Settings.ShowWelcomeDialog`,
    hint: `${pubConstants.langRoot}.Settings.ShowWelcomeDialogHint`,
    scope: 'world',
    config: true,
    default: true,
    type: Boolean
  })
}
