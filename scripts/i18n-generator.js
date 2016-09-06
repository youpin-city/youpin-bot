/* eslint no-param-reassign: ["warn"] */
const i18nConfig = require('config').get('i18n');
const _ = require('lodash');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const saw = require('string-saw');
const os = require('os');

const files = ['youpin.js'];

function extractKeysFromFile(file) {
  return fs.readFileAsync(file, 'utf8')
  .then(data => {
    const keys = saw(data)
      .split(os.EOL)
      .map(line => saw(line)
        // Extracting <STRING> from __.("<STRING>")
        .match(/(?:__n?\(['"])(.+?)(?:['"])/)
        .toArray()
      )
      .toArray();
    return _.flatten(keys);
  });
}

function updateKeysToFile(keys, lang) {
  const file = `${i18nConfig.directory}/${lang}.json`;
  fs.readFileAsync(file, 'utf8')
      .then(data => {
        console.log(`Updating ${file}`);
        const oldKeys = JSON.parse(data);
        const mergedKeys = _.merge(keys, oldKeys);
        fs.writeFileAsync(file, JSON.stringify(mergedKeys, null, 4))
          .then((err) => {
            if (err) console.log(err);
            console.log(`Done : ${file}`);
          });
      });
}

Promise.map(files, extractKeysFromFile).then(items => {
  const keys = _.chain(items)
      .flatten()
      .uniq()
      .sort()
      .transform((obj, a) => {
        obj[a] = '';
      }, {})
      .value();

  console.log(`We have ${_.keys(keys).length} i18n keys.`);

  _.each(i18nConfig.locales, lang => {
    updateKeysToFile(keys, lang);
  });
});
