'use strict';

module.exports = {
  __depends__: [ require('../dragging'), require('../keyboard') ],
  __init__: [ 'toolManager' ],
  toolManager: [ 'type', require('./ToolManager') ]
};
