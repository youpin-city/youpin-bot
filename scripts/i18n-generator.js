var i18nConfig = require("config").get("i18n")
var _ = require('lodash');
var Promise =require('bluebird');
var fs = Promise.promisifyAll(require("fs"));
var saw = require('string-saw')

var files = ['youpin.js'];

function extractKeysFromFile(file){
  return fs.readFileAsync( file, "utf8")
  .then( data => {
    var keys = saw(data)
    .split("\n")
    .map( line => {
      return saw(line).match(/(?:__n?\(['"])(.+?)(?:['"])\)/).toArray();
    }).toArray();
    return _.flatten(keys);
  });
}

function updateKeysToFile( keys, lang ){
    var file = i18nConfig.directory+"/"+lang+".json";
    fs.readFileAsync( file, "utf8" )
      .then( data => {
        console.log("Updating " + file );
        var oldKeys = JSON.parse(data);
        var mergedKeys = _.merge( keys, oldKeys )
        fs.writeFileAsync(file, JSON.stringify(mergedKeys, null, 4))
          .then( (err) => {
              if(err) console.log(err)
              console.log("Done : " + file )
          })
      });
}

Promise.map( files, extractKeysFromFile ).then( keys => {
    keys = _.chain(keys)
      .flatten()
      .uniq()
      .sort()
      .transform( (obj, a) => {
        obj[a] = "";
      }, {} )
      .value();

    console.log("We have "+ _.keys(keys).length + " i18n keys.");

    _.each(i18nConfig.locales, lang => {
        updateKeysToFile( keys, lang )
    });
});
