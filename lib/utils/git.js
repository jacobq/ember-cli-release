/* jshint node:true */

'use strict';

var Repo = require('git-tools');
var RSVP = require('rsvp');

var RepoPrototype = Repo.prototype;

/**
 * Add methods to the git-tools class, these should eventually be made into a PR
 */

RepoPrototype.currentTag = function(callback) {
  var self = this;

  this.exec("rev-parse", "HEAD", function(error, data) {
    if (error) {
      return callback(error);
    }

    // Look up the tag name using the current SHA
    self.exec("name-rev", "--tags", "--name-only", data, function(error, data) {
      var tagName = null;

      if (error) {
        return callback(error);
      }

      // Git outputs 'undefined' if the SHA does not match a tag (not JS related)
      if (data !== 'undefined') {
        // Newer versions of git return the distance to the tag using ~ notation,
        // in which case sha^0 is distance zero
        var match = data.match(/(.*)(\^0|~\d+)$/);

        if (match) {
          tagName = match[2] === '^0' ? match[1] : null;
        }
      }

      callback(null, tagName);
    });
  });
};

RepoPrototype.createTag = function(tagName, message, callback) {
  this.exec("tag", "--annotate", "--message='"+ message + "'", tagName, callback);
};

RepoPrototype.pushTags = function(remote, callback) {
  this.exec("push", remote, "--tags", callback);
};

/**
 * Create promise-aware wrapper for git-tools class
 */

function DenodeifiedRepo() {
  Repo.apply(this, arguments);
}

var DenodeifiedRepoPrototype = DenodeifiedRepo.prototype = Object.create(RepoPrototype);

DenodeifiedRepoPrototype.constructor = DenodeifiedRepo;

// Whitelist prototype methods, since some are used internally (e.g. `exec`)
var repoMethods = [
  'tags',
  'currentTag',
  'createTag',
  'pushTags'
];

repoMethods.forEach(function(methodName) {
  DenodeifiedRepoPrototype[methodName] = RSVP.denodeify(RepoPrototype[methodName]);
});

module.exports = DenodeifiedRepo;