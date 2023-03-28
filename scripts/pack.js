const Datastore = require('nedb')
const util = require('util')
const path = require('path')

class Pack {
  constructor (data, basedir = undefined) {
    this.pack = data
    let filename = this.pack.path
    if (basedir) {
      filename = path.join(basedir, filename)
    }
    this.db = new Datastore({ filename, autoload: true })
  }

  async compact () {
    await this.db.persistence.compactDatafile()
    console.log('Compacted ', this.pack.name)
  }

  async processDocuments (handler) {
    const context = this
    // NeDB doesn't do synchronous, so wrap this in a promise so we can wait for it
    const complete = new Promise(function (resolve, reject) {
      context.db.find({ name: { $exists: true } }, function (err, docs) {
        if (err) return

        for (const doc of docs) {
          const handled = handler(context.pack, doc)
          if (handled === null) {
            context.db.remove({ _id: doc._id }, function (err, numRemoved) {
              if (!err) {
                console.log('Removed ', numRemoved, ': ', doc.name, ' (', doc._id, ')')
              }
            })
          } else if (!util.isDeepStrictEqual(doc, handled)) {
            context.db.update({ _id: doc._id }, handled, function (err, numReplaced) {
              if (!err) {
                console.log('Replaced ', numReplaced, ': ', doc.name, ' (', doc._id, ')')
              }
            })
          }
        }

        // Done finding
        resolve('done')
      })
    })
    await complete
  }
}

exports.Pack = Pack
