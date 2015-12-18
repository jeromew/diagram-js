'use strict';

var TestHelper = require('../../../TestHelper'),
    canvasEvent = require('../../../util/MockEvents').createCanvasEvent;

/* global bootstrapDiagram, inject */

var clipboardModule = require('../../../../lib/features/clipboard'),
    copyPasteModule = require('../../../../lib/features/copy-paste'),
    selectionModule = require('../../../../lib/features/selection'),
    modelingModule = require('../../../../lib/features/modeling'),
    rulesModule = require('./rules');


describe('features/copy-paste - ', function() {

  beforeEach(bootstrapDiagram({
    modules: [ clipboardModule, rulesModule, copyPasteModule, modelingModule, selectionModule  ]
  }));

  describe('basics', function() {

    var rootShape, parentShape, host, attacher, childShape, childShape2, connection;

    beforeEach(inject(function(elementFactory, canvas, modeling) {

      rootShape = elementFactory.createRoot({
        id: 'root'
      });

      canvas.setRootElement(rootShape);

      parentShape = elementFactory.createShape({
        id: 'parent',
        x: 600, y: 200,
        width: 600, height: 300
      });

      canvas.addShape(parentShape, rootShape);

      host = elementFactory.createShape({
        id:'host',
        x: 300, y: 50,
        width: 100, height: 100
      });

      canvas.addShape(host, rootShape);

      attacher = elementFactory.createShape({
        id: 'attacher',
        x: 375, y: 25,
        width: 50, height: 50
      });

      canvas.addShape(attacher, rootShape);

      modeling.updateAttachment(attacher, host);

      childShape = elementFactory.createShape({
        id: 'childShape',
        x: 110, y: 110,
        width: 100, height: 100
      });

      canvas.addShape(childShape);

      childShape2 = elementFactory.createShape({
        id: 'childShape2',
        x: 400, y: 200,
        width: 100, height: 100
      });

      canvas.addShape(childShape2);

      connection = elementFactory.createConnection({
        id: 'connection',
        waypoints: [
          { x: 160, y: 160 },
          { x: 450, y: 250 }
        ],
        source: childShape,
        target: childShape2
      });

      canvas.addConnection(connection);
    }));

    describe('copy', function () {

      it('should add shape to clipboard', inject(function(copyPaste, clipboard) {
        // when
        copyPaste.copy([ host, childShape, childShape2 ]);

        var tree = clipboard.get();

        // then
        expect(tree[0]).to.have.keys('host', 'childShape', 'childShape2', 'attacher', 'connection');
      }));


      it('should not have previous copied elements', inject(function(copyPaste, clipboard) {
        // given
        copyPaste.copy(childShape);

        // when
        copyPaste.copy([ childShape2, connection ]);

        var tree = clipboard.get();

        // then
        expect(tree[0]).to.have.keys('childShape2');
        expect(tree[1]).to.be.empty;
      }));

    });

    describe.only('paste', function () {

      it('should paste', inject(function(copyPaste, selection, elementFactory, canvas) {
        // given
        var testShapes = [ host, childShape, childShape2 ];

        // when
        copyPaste.copy(testShapes);

        copyPaste.paste(parentShape);

        // then
        expect(parentShape.children).to.have.length(5);
      }));

    });

  });

  describe('#createTree', function () {
    var sB = { id: 'b', parent: { id: 'a' }, x: 0, y: 0, width: 100, height: 100 },
        sC = { id: 'c', parent: sB, x: 0, y: 0, width: 100, height: 100 },
        sD = { id: 'd', parent: sB, x: 0, y: 0, width: 100, height: 100 },
        sE = { id: 'e', parent: { id: 'y' }, x: 0, y: 0, width: 100, height: 100 },
        sF = { id: 'f', parent: sE, x: 0, y: 0, width: 100, height: 100 },
        sG = { id: 'g', parent: sF, x: 0, y: 0, width: 100, height: 100 },
        sW = { id: 'w', parent: { id: 'z' }, x: 0, y: 0, width: 100, height: 100 };

    var cA = { id: 'connA', parent: sB, source: sC, target: sD,
               waypoints: [ { x: 0, y: 0, original: { x: 50, y: 50 } } ] },
        cB = { id: 'connB', parent: { id: 'p' }, source: sC, target: sW,
               waypoints: [ { x: 0, y: 0 } ] };

    var host = { id: 'host', parent: { id: 't' }, x: 0, y: 0, width: 100, height: 100 },
        attacher = { id: 'attacher', parent: { id: 't' }, x: 0, y: 0, width: 100, height: 100 };

    sB.children = [ sC, sD, cA ];
    sF.children = [ sG ];
    sE.children = [ sF ];

    sC.outgoing = cA;
    sD.incoming = cA;

    host.attacher = attacher;
    attacher.host = host;


    it('should create tree of shapes', inject(function(copyPaste) {
      // when
      var tree = copyPaste.createTree([ sE, sF, sG ]);

      // then
      expect(tree[0]).to.have.keys('e');
      expect(tree[1]).to.have.keys('f');
      expect(tree[2]).to.have.keys('g');
    }));


    it('should create a tree of shapes and connections', inject(function(copyPaste) {
      // when
      var tree = copyPaste.createTree([ sB, sC, sD, sE, sF, sG, cA, cB ]);

      // then
      expect(tree[0]).to.have.keys('b', 'e');
      expect(tree[1]).to.have.keys('c', 'd', 'f', 'connA');
      expect(tree[2]).to.have.keys('g');

      expect(tree[1]).to.not.have.keys('connB');

      expect(tree[1].c.parent).to.equal('b');

      expect(tree[1].connA.source).to.equal('c');
      expect(tree[1].connA.target).to.equal('d');
    }));


    it('should create a tree of everything', inject(function(copyPaste) {
      // when
      var tree = copyPaste.createTree([ sB, sC, sD, sE, sF, sG, cA, cB, host ]);

      // then
      expect(tree[0]).to.have.keys('b', 'e', 'host');
      expect(tree[1]).to.have.keys('c', 'd', 'f', 'connA');
      expect(tree[2]).to.have.keys('g');

      expect(tree[0].host.attacher).to.equal('attacher');
    }));

  });

});
