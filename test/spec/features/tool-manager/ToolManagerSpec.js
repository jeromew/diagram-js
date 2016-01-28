'use strict';

require('../../../TestHelper');

var canvasEvent = require('../../../util/MockEvents').createCanvasEvent;
var createKeyEvent = require('../../../util/KeyEvents').createKeyEvent;

var TestContainer = require('mocha-test-container-support');

/* global bootstrapDiagram, inject */


var toolManagerModule = require('../../../../lib/features/tool-manager'),
    handToolModule = require('../../../../lib/features/hand-tool'),
    keyboardModule = require('../../../../lib/features/keyboard'),
    draggingModule = require('../../../../lib/features/dragging');

var Cursor = require('../../../../lib/util/Cursor');


describe('features/tool-manager', function() {

  beforeEach(bootstrapDiagram({ modules: [ toolManagerModule, keyboardModule, handToolModule, draggingModule ] }));

  beforeEach(inject(function(dragging) {
    dragging.setOptions({ manual: true });
  }));

  describe('basics', function() {

    it('should register a tool', inject(function(toolManager) {
      // when
      toolManager.registerTool('lasso', {
        tool: 'lasso.selection',
        dragging: 'lasso'
      });

      // then
      expect(toolManager.length()).to.equal(2);
    }));


    it('should throw error when registering a tool without events', inject(function(toolManager) {
      // when
      function result() {
        toolManager.registerTool('hand', { tool: 'foo' });
      }

      // then
      expect(result).to.throw('A tool has to be registered with it\'s "events"');
    }));


    it('should have hand-tool as active', inject(function(toolManager, handTool) {
      // when
      handTool.activateHand(canvasEvent({ x: 150, y: 150 }));

      expect(toolManager.isActive('hand')).to.be.true;
    }));


    it('should have no active tool', inject(function(toolManager, handTool, dragging) {
      // when
      handTool.activateHand(canvasEvent({ x: 150, y: 150 }));

      dragging.end();

      expect(toolManager.isActive('hand')).to.be.false;
    }));

  });


  describe('cursor', function () {

    var container;

    beforeEach(function() {
      container = TestContainer.get(this);

      Cursor.unset();
    });

    it('should register with cursor', inject(function(toolManager) {
      // when
      toolManager.registerTool('lasso', {
        tool: 'lasso.selection',
        dragging: 'lasso',
        cursor: 'crosshair',
        handler: function(event) {
          return true;
        }
      });

      expect(toolManager._cursors.lasso).to.exist;
    }));


    it('should add cursor', inject(function(keyboard, toolManager) {
      // when
      var e = createKeyEvent(container, 17, true);

      keyboard._keydownHandler(e);

      expect(Cursor.has('grab')).to.be.true;
    }));


    it('should remove cursor', inject(function(keyboard, toolManager) {
      // when
      var keydown = createKeyEvent(container, 17, true),
          keyup = createKeyEvent(container, 17, false);

      keyboard._keydownHandler(keydown);

      keyboard._keyupHandler(keyup);

      expect(Cursor.has('grab')).to.be.false;
    }));

  });

});
