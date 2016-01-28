'use strict';

var forEach = require('lodash/collection/forEach');

var Cursor = require('../../util/Cursor');

var LOW_PRIORITY = 250;



/**
 * The tool manager acts as middle-man between the available tool's and the Palette,
 * it takes care of making sure that the correct active state is set.
 *
 * @param  {Object}    eventBus
 * @param  {Object}    dragging
 */
function ToolManager(eventBus, dragging, keyboard) {
  var self = this;

  this._eventBus = eventBus;
  this._dragging = dragging;
  this._keyboard = keyboard;

  this._tools = [];
  this._active = null;

  this._cursors = {};

  eventBus.on('keyboard.init', function() {

    keyboard.addListener('keyup', function(key, modifiers) {
      // when a tool is active we shouldn't reset the cursor
      if (dragging.context()) {
        return;
      }

      Cursor.unset();

      return true;
    });

    keyboard.addListener('keydown', function(key, modifiers) {
      // when a tool is active we shouldn't change the cursor
      if (dragging.context()) {
        return;
      }

      forEach(self._cursors, function(data, tool) {
        var cursor = data.cursor,
            handler = data.handler;

        if (handler(modifiers)) {
          Cursor.set(cursor);

          return false;
        }
      });
    });
  });
}

ToolManager.$inject = [ 'eventBus', 'dragging', 'keyboard' ];

module.exports = ToolManager;

ToolManager.prototype.registerTool = function(name, options) {
  var tools = this._tools;

  if (!options || (!options.tool || !options.dragging)) {
    throw new Error('A tool has to be registered with it\'s "events"');
  }

  tools.push(name);

  this.bindEvents(name, options);
};

ToolManager.prototype.isActive = function(tool) {
  return tool && this._active === tool;
};

ToolManager.prototype.length = function(tool) {
  return this._tools.length;
};

ToolManager.prototype.setActive = function(tool) {
  var eventBus = this._eventBus;

  if (this._active !== tool) {
    this._active = tool;

    eventBus.fire('tool-manager.update', { tool: tool });
  }
};

ToolManager.prototype.bindEvents = function(name, options) {
  var eventBus = this._eventBus,
      dragging = this._dragging;

  var eventsToRegister = [];

  if (options.cursor && options.handler) {
    this._cursors[name] = {
      cursor: options.cursor,
      handler: options.handler
    };

    delete options.cursor;
    delete options.handler;
  }

  eventBus.on(options.tool + '.init', function(event) {

    var context = event.context;

    // Active tools that want to reactivate themselves must do this explicitly
    if (!context.reactivate && this.isActive(name)) {
      this.setActive(null);

      dragging.cancel();
      return;
    }

    this.setActive(name);

  }, this);

  // Todo[ricardo]: add test cases
  forEach(options, function(event, key) {
    eventsToRegister.push(event + '.ended');
    eventsToRegister.push(event + '.canceled');
  });

  eventBus.on(eventsToRegister, LOW_PRIORITY, function(event) {
    var originalEvent = event.originalEvent;

    // We defer the de-activation of the tool to the .activate phase,
    // so we're able to check if we want to toggle off the current active tool or switch to a new one
    if (!this._active ||
        (originalEvent && originalEvent.target.parentElement.getAttribute('data-group') === 'tools')) {
      return;
    }

    this.setActive(null);
  }, this);
};
