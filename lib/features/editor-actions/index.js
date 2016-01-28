'use strict';

module.exports = {
  __depends__: [
    require('../selection'),
    require('../modeling'),
    require('../../command'),
    require('../../navigation/zoomscroll')
  ],
  __init__: [ 'editorActions' ],
  editorActions: [ 'type', require('./EditorActions') ]
};
