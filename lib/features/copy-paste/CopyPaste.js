'use strict';

var isArray = require('lodash/lang/isArray'),
    forEach = require('lodash/collection/forEach'),
    find = require('lodash/collection/find'),
    sortBy = require('lodash/collection/sortBy'),
    unique = require('lodash/array/uniq');

var getBBox = require('../../util/Elements').getBBox;

var positionUtil = require('../../util/PositionUtil');

var CopyPasteUtil = require('../../util/CopyPasteUtil'),
    ElementsUtil = require('../../util/Elements');


function CopyPaste(modeling, elementFactory, rules, clipboard) {
  this._modeling = modeling;
  this._elementFactory = elementFactory;
  this._rules = rules;

  this._clipboard = clipboard;

  this._descriptors = [];


  // Element creation priorities:
  // - 1: Independent shapes
  // - 2: Attached shapes and labels
  // - 3: Connections
  this.registerDescriptor(function(element, descriptor) {
    // Base priority
    descriptor.priority = 1;

    descriptor.id = element.id;

    if (element.parent) {
      descriptor.parent = element.parent.id;
    }

    if (element.labelTarget) {
      // Labels priority
      descriptor.priority = 2;
      descriptor.labelTarget = element.labelTarget.id;
    }

    if (element.host) {
      // Attached shapes priority
      descriptor.priority = 2;
      descriptor.host = element.host.id;
    }

    if (element.width) {
      descriptor.x = element.x;
      descriptor.y = element.y;
      descriptor.width = element.width;
      descriptor.height = element.height;
    }

    if (element.waypoints) {
      // Connections priority
      descriptor.priority = 3;
      descriptor.waypoints = [];

      forEach(element.waypoints, function(waypoint) {
        var wp = {
          x: waypoint.x,
          y: waypoint.y
        };

        if (waypoint.original) {
          wp.original = {
            x: waypoint.original.x,
            y: waypoint.original.y
          };
        }

        descriptor.waypoints.push(wp);
      });
    }

    if (element.source && element.target) {
      descriptor.source = element.source.id;
      descriptor.target = element.target.id;
    }

    return descriptor;
  });
}

CopyPaste.prototype._computeDelta = function(element) {
  var bbox = this._bbox,
      delta = {};

  if (element.priority === 3) {
    delta = [];

    forEach(element.waypoints, function(waypoint) {
      delta.push(positionUtil.delta(waypoint, bbox));
    }, this);
  } else {
    delta = positionUtil.delta(element, bbox);
  }

  return delta;
};

// Pass in the elements to copy
CopyPaste.prototype.copy = function(selectedElements) {
  var clipboard = this._clipboard,
      tree;

  if (!selectedElements) {
    return;
  }

  if (!isArray(selectedElements)) {
    selectedElements = selectedElements ? [ selectedElements ] : [];
  }

  // Reset CLIPBOARD on every copy
  clipboard.clear();

  tree = this.createTree(selectedElements);

  this._bbox = positionUtil.center(getBBox(tree.allShapes));

  delete tree.allShapes;

  forEach(tree, function(elements) {

    forEach(elements, function(element) {
      element.delta = this._computeDelta(element);
    }, this);
  }, this);

  clipboard.set(tree);
};

CopyPaste.prototype.canCopy = function(element) {
  var rules = this._rules;
  return true;
  // return rules.allowed('element.copy', {
  //   element: element
  // });
};

CopyPaste.prototype.canPaste = function(element, parent) {
  var rules = this._rules;

  return true;
  // return rules.allowed('element.paste', {
  //   element: element,
  //   target: parent
  // });
};


// Allow pasting under the cursor
CopyPaste.prototype.paste = function(topParent) {
  var self = this;

  var modeling = this._modeling,
      elementFactory = this._elementFactory;

  var clipboard = this._clipboard;

  var tree = clipboard.get(),
      parentCenter;

  if (clipboard.isEmpty()) {
    return;
  }

  parentCenter = positionUtil.center(topParent);

  tree.createdShapes = {};

  forEach(tree, function(elements, depthStr) {
    var depth = parseInt(depthStr, 10);

    if (isNaN(depth)) {
      return;
    }

    // Order by priority for element creation
    elements = sortBy(elements, 'priority');

    forEach(elements, function(descriptor) {
      var id = descriptor.id,
          host = false,
          parent, source, target;

      delete descriptor.id;

      // set parent
      if (!parseInt(depth, 10)) {
        parent = topParent;
      } else {
        parent = tree.createdShapes[descriptor.parent];
      }

      if (!self.canPaste(descriptor, parent)) {
        return;
      }

      if (descriptor.waypoints) {

        forEach(descriptor.waypoints, function(waypoint, idx) {
          waypoint.x = parentCenter.x + descriptor.delta[idx].x;
          waypoint.y = parentCenter.y + descriptor.delta[idx].y;
        });

        source = tree.createdShapes[descriptor.source];
        target = tree.createdShapes[descriptor.target];

        delete descriptor.parent;
        delete descriptor.source;
        delete descriptor.target;

        modeling.createConnection(source, target, descriptor, parent);

        tree.createdShapes[id] = shape;

        return;
      }

      // set host
      if (descriptor.host) {
        host = true;

        parent = tree.createdShapes[descriptor.host];
      }

      // handle labels
      // if (descriptor.labelTarget) {
      //
      // }

      delete descriptor.host;
      delete descriptor.parent;
      delete descriptor.labelTarget;

      var position = {
        x: parentCenter.x + descriptor.delta.x + (descriptor.width / 2),
        y: parentCenter.y + descriptor.delta.y + (descriptor.height / 2)
      };

      var shape = elementFactory.createShape(descriptor);

      modeling.createShape(shape, position, parent, host);

      tree.createdShapes[id] = shape;
    }, this);

  }, this);

};

// Possible dependants: connections, labels, attachers
CopyPaste.prototype.hasRelations = function(elements, element) {
  var source, target, host, labelTarget;

  if (element.waypoints) {
    source = find(elements, { element: { id: element.source.id } });
    target = find(elements, { element: { id: element.target.id } });

    if (!source || !target) {
      return false;
    }
  }

  if (element.labelTarget) {
    labelTarget = find(elements, { element: { id: element.labelTarget.id } });

    if (!labelTarget) {
      return false;
    }
  }

  if (element.host) {
    host = find(elements, { element: { id: element.host.id } });

    if (!host) {
      return false;
    }
  }

  return true;
};

CopyPaste.prototype.registerDescriptor = function(descriptor) {
  if (typeof descriptor !== 'function') {
    throw new Error('the descriptor must be a function');
  }

  if (this._descriptors.indexOf(descriptor) !== -1) {
    throw new Error('this descriptor is already registered');
  }

  this._descriptors.push(descriptor);
};

CopyPaste.prototype._executeDescriptors = function(data) {
  if (!data.descriptor) {
    data.descriptor = {};
  }

  forEach(this._descriptors, function(descriptor) {
    data.descriptor = descriptor(data.element, data.descriptor);
  });

  return data;
};

/**
 * Creates a tree like structure from an arbitrary collection of elements
 *
 * @example
 * tree: {
 * 	0: [
 * 		{ id: 'shape_12da', priority: 1, ... },
 * 		{ id: 'shape_01bj', priority: 1, ... },
 * 		{ id: 'connection_79fa', source: 'shape_12da', target: 'shape_01bj', priority: 3, ... },
 * 	],
 * 	1: [ ... ]
 * };
 *
 * @param  {Array} elements
 * @return {Object}
 */
CopyPaste.prototype.createTree = function(elements) {
  var self = this;

  var tree = {},
      includedElements = [];

  var topLevel = CopyPasteUtil.getTopLevel(elements);

  tree.allShapes = [];

  ElementsUtil.eachElement(topLevel, function(element, i, depth) {
    var nestedChildren = element.children,
        data = {
          element: element,
          depth: depth
        };

    if (!tree[depth]) {
      tree[depth] = [];
    }

    if (!self.canCopy(element)) {
      return;
    }

    if (element.attachers && element.attachers.length) {
      forEach(element.attachers, function(attacher) {
        if (!self.canCopy(attacher)) {
          return;
        }
        includedElements.push({
          element: attacher,
          depth: depth
        });
      });
    }
    if (element.incoming && element.incoming.length) {
      forEach(element.incoming, function(connection) {
        if (!self.canCopy(connection)) {
          return;
        }
        includedElements.push({
          element: connection,
          depth: depth
        });
      });
    }
    if (element.outgoing && element.outgoing.length) {
      forEach(element.outgoing, function(connection) {
        if (!self.canCopy(connection)) {
          return;
        }
        includedElements.push({
          element: connection,
          depth: depth
        });
      });
    }

    includedElements.push(data);

    if (nestedChildren) {
      return nestedChildren;
    }
  });

  includedElements = unique(includedElements, function(data) {
    return data.element.id;
  });

  forEach(includedElements, function(data) {
    var depth = data.depth,
        element = {};

    if (!this.hasRelations(includedElements, data.element)) {
      return;
    }

    tree.allShapes.push(data.element);

    data = this._executeDescriptors(data);

    tree[depth].push(data.descriptor);
  }, this);

  return tree;
};

CopyPaste.$inject = [ 'modeling', 'elementFactory', 'rules', 'clipboard' ];

module.exports = CopyPaste;
