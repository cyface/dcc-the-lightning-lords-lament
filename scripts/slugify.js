const slugifyWrapped = require('slugify')

const slugParams = {
  lower: true,
  strict: true
}

// Wrapper to unify slugify options everywhere
function slugify (string) {
  return slugifyWrapped(string, slugParams)
}

module.exports = slugify
