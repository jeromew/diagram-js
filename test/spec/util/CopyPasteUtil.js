'use strict';

var CopyPasteUtil = require('../../../lib/util/CopyPasteUtil');


describe('util/CopyPasteUtil', function() {

  describe('#getTopLevel', function () {

    var sB = { id: 'b', parent: { id: 'a' } },
        sC = { id: 'c', parent: { id: 'a' } },
        sE = { id: 'e', parent: { id: 'a' } },
        sD = { id: 'd', parent: { id: 'b' } },
        sF = { id: 'f', parent: { id: 'e' } },
        sG = { id: 'g', parent: { id: 'f' } },
        sX = { id: 'x', parent: { id: 'y' } };


    it('should only get the top level', function() {
      // when
      var topLevel = CopyPasteUtil.getTopLevel([ sB, sC, sE, sD, sG, sF, sX ]);

      // then
      expect(topLevel).to.contain(sB, sC, sE, sX);
      expect(topLevel.length).to.equal(4);
    });

  });

});
