'use strict';

var inherits = require('inherits');

var RuleProvider = require('../../../../../lib/features/rules/RuleProvider');


function CopyPasteRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

CopyPasteRules.$inject = [ 'eventBus' ];

inherits(CopyPasteRules, RuleProvider);

module.exports = CopyPasteRules;


CopyPasteRules.prototype.init = function() {

  this.addRule('element.copy', function(context) {
    console.log(context);
    return true;
  });

  this.addRule('elements.paste', function(context) {
    return true;
  });
};
