'use strict';

var Cursor = require('../../../lib/util/Cursor');


describe('Cursor', function() {

  beforeEach(function() {
    Cursor.unset();
  });

  it('should set cursor', function() {
    // when
    Cursor.set('grab');

    // then
    expect(Cursor.has('grab')).to.be.true;
  });


  it('should remove cursor', function() {
    // given
    Cursor.set('grab');

    // when
    Cursor.unset();

    // then
    expect(Cursor.has('grab')).to.be.false;
  });


  it('should assign the previous cursor', function() {
    // given
    Cursor.set('grab');

    Cursor.set('crosshair');

    // when
    Cursor.unset();

    // then
    expect(Cursor.has('grab')).to.be.true;
  });


  it('should be complex', function() {
    // given
    Cursor.set('grab');

    Cursor.unset();

    Cursor.set('crosshair');

    Cursor.set('move');

    Cursor.set('grab');

    Cursor.set('grab');

    // when
    Cursor.unset();

    Cursor.unset();

    // then
    expect(Cursor.has('move')).to.be.true;
  });

});
