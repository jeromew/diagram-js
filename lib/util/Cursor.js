'use strict';

var domClasses = require('min-dom/lib/classes');

var CURSOR_CLS_PATTERN = /^djs-cursor-.*$/;

var stack = [ null ];

function add(mode) {
  var classes = domClasses(document.body);

  classes.removeMatching(CURSOR_CLS_PATTERN);

  if (mode) {
    classes.add('djs-cursor-' + mode);
  }
}

module.exports.set = function(mode) {
  stack.push(mode);

  add(mode);
};

module.exports.unset = function() {
  stack.pop();

  add(stack[ stack.length - 1 ]);
};

module.exports.has = function(mode) {
  var classes = domClasses(document.body);

  return classes.has('djs-cursor-' + mode);
};
