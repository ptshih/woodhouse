(function(root, factory) {
  "use strict";
  // Set up Backbone appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['backbone', 'underscore', 'jquery'], function(Backbone, _, $) {

      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global.
      root.Woodhouse = factory(root, Backbone, _, $);
    });
  } else {
    root.Woodhouse = factory(root, root.Backbone, root._, (root.jQuery || root.$));
  }
}(this, function(root, Backbone, _, $) {
  "use strict";

  // What is Woodhouse?
  // ---
  // Woodhouse is an extension to Backbone.
  // Woodhouse adds the following things to Backbone:
  // - View, Region, and Subview management (inspired by marionette.js)
  // - Model-View bindings (inspired by knockout.js)
  // - Model relations
  // - Model computed properties
  // - A better Router that aborts XHR requests when navigating

  // Required dependencies
  var missingDeps = [];
  if (Backbone === undefined) {
    missingDeps.push('Backbone');
  }
  if (_ === undefined) {
    missingDeps.push('_');
  }
  if ($ === undefined) {
    missingDeps.push('$');
  }
  if (missingDeps.length > 0) {
    console.log("Warning! %s is undefined. Woodhouse aborted.", missingDeps.join(", "));
    return;
  }

  // Define and export the Woodhouse namespace
  var Woodhouse = {};

  // Version string
  Woodhouse.VERSION = '0.2.14';

  // Debug flag
  Woodhouse.DEBUG = false;

  // Get jquery
  Woodhouse.$ = $;

  // Get lodash
  Woodhouse._ = _;

  // jQuery extensions
  // ---

  // Helper for inserting a child element at a specific index
  $.fn.insertAt = function(index, element) {
    var lastIndex = this.children()
      .size();
    if (index < 0) {
      index = Math.max(0, lastIndex + 1 + index);
    }
    this.append(element);
    if (index < lastIndex) {
      this.children()
        .eq(index)
        .before(this.children()
          .last());
    }
    return this;
  };

  // jQuery "splendid textinput" plugin
  // http://benalpert.com/2013/06/18/a-near-perfect-oninput-shim-for-ie-8-and-9.html
  // https://github.com/pandell/jquery-splendid-textchange
  (function initSplendidTextChange($) {
    // Determine if this is a modern browser (i.e. not IE 9 or older);
    // if it is, the "input" event is exactly what we want so simply
    // mirror it as "textchange" event
    var testNode = document.createElement("input");
    var isInputSupported = (testNode.oninput !== undefined &&
      ((document.documentMode || 100) > 9));
    if (isInputSupported) {
      $(document)
        .on("input", function mirrorInputEvent(e) {
          $(e.target)
            .trigger("textchange");
        });

      return;
    }


    // ********* OLD IE (9 and older) *********

    var queueEventTargetForNotification = null;
    var activeElement = null;
    var notificationQueue = [];
    var watchedEvents = "keyup keydown";

    // 90% of the time, keydown and keyup aren't necessary. IE 8 fails
    // to fire propertychange on the first input event after setting
    // `value` from a script and fires only keydown, keypress, keyup.
    // Catching keyup usually gets it and catching keydown lets us fire
    // an event for the first keystroke if user does a key repeat
    // (it'll be a little delayed: right before the second keystroke).


    // Return true if the specified element can generate
    // change notifications (i.e. can be used by users to input values).
    function hasInputCapabilities(elem) {
      // The HTML5 spec lists many more types than `text` and `password` on
      // which the input event is triggered but none of them exist in IE 8 or
      // 9, so we don't check them here
      return (
        (elem.nodeName === "INPUT" &&
          (elem.type === "text" || elem.type === "password")) ||
        elem.nodeName === "TEXTAREA"
      );
    }


    // Update the specified target so that we can track its value changes.
    // Returns true if extensions were successfully installed, false otherwise.
    function installValueExtensionsOn(target) {
      if (target.valueExtensions) {
        return true;
      }
      if (!hasInputCapabilities(target)) {
        return false;
      }

      // add extensions container
      // not setting "current" initially (to "target.value") allows
      // drag & drop operations (from outside the control) to send change notifications
      target.valueExtensions = {
        current: null
      };

      // attempt to override "target.value" property
      // so that it prevents "propertychange" event from firing
      // (for consistency with "input" event behaviour)
      if (target.constructor && target.constructor.prototype) { // target.constructor is undefined in quirks mode
        var descriptor = Object.getOwnPropertyDescriptor(target.constructor.prototype, "value");
        Object.defineProperty(target, "value", { // override once, never delete
          get: function() {
            return descriptor.get.call(this);
          },
          set: function(val) {
            target.valueExtensions.current = val;
            descriptor.set.call(this, val);
          }
        });
      }

      // subscribe once, never unsubcribe
      $(target)
        .on("propertychange", queueEventTargetForNotification)
        .on("dragend", function onSplendidDragend(e) {
          window.setTimeout(function onSplendidDragendDelayed() {
            queueEventTargetForNotification(e);
          }, 0);
        });

      return true;
    }


    // Fire "textchange" event for each queued element whose value changed.
    function processNotificationQueue() {
      // remember the current notification queue (for processing)
      // + create a new queue so that if "textchange" event handlers
      // cause new notification requests to be queued, they will be
      // added to the new queue and handled in the next tick
      var q = notificationQueue;
      notificationQueue = [];

      var target, targetValue, i, l;
      for (i = 0, l = q.length; i < l; i += 1) {
        target = q[i];
        targetValue = target.value;
        if (target.valueExtensions.current !== targetValue) {
          target.valueExtensions.current = targetValue;
          $(target)
            .trigger("textchange");
        }
      }
    }


    // If target element of the specified event has not yet been
    // queued for notification, queue it now.
    queueEventTargetForNotification = function queueEventTargetForNotification(e) {
      var target = e.target;
      if (installValueExtensionsOn(target) && target.valueExtensions.current !== target.value) {
        var i, l;
        for (i = 0, l = notificationQueue.length; i < l; i += 1) {
          if (notificationQueue[i] === target) {
            break;
          }
        }
        if (i >= l) { // "target" is not yet queued
          notificationQueue.push(target);

          if (l === 0) { // we just queued the first item, schedule processor in the next tick
            window.setTimeout(processNotificationQueue, 0);
          }
        }
      }
    };


    // Mark the specified target element as "active" and add event listeners to it.
    function startWatching(target) {
      activeElement = target;
      $(activeElement)
        .on(watchedEvents, queueEventTargetForNotification);
    }


    // Remove the event listeners from the "active" element and set "active" to null.
    function stopWatching() {
      if (activeElement) {
        $(activeElement)
          .off(watchedEvents, queueEventTargetForNotification);
        activeElement = null;
      }
    }


    // In IE 8, we can capture almost all .value changes by adding a
    // propertychange handler (in "installValueExtensionsOn").
    //
    // In IE 9, propertychange/input fires for most input events but is buggy
    // and doesn't fire when text is deleted, but conveniently,
    // "selectionchange" appears to fire in all of the remaining cases so
    // we catch those.
    //
    // In either case, we don't want to call the event handler if the
    // value is changed from JS so we redefine a setter for `.value`
    // that allows us to ignore those changes (in "installValueExtensionsOn").
    $(document)
      .on("focusin", function onSplendidFocusin(e) {
        // stopWatching() should be a noop here but we call it just in
        // case we missed a blur event somehow.
        stopWatching();

        if (installValueExtensionsOn(e.target)) {
          startWatching(e.target);
        }
      })

    .on("focusout", stopWatching)

    .on("input", queueEventTargetForNotification)

    .on("selectionchange", function onSplendidSelectionChange(e) {
      // IE sets "e.target" to "document" in "onselectionchange"
      // event (not very useful); use document.selection instead
      // to determine actual target element
      if (document.selection) {
        var r = document.selection.createRange();
        if (r) {
          var p = r.parentElement();
          if (p) {
            e.target = p;
            queueEventTargetForNotification(e);
          }
        }
      }
    });

  }($));



  // Javascript extensions
  // ---

  // Moves an array element from one index to another
  Array.prototype.move = function(from, to) {
    this.splice(to, 0, this.splice(from, 1)[0]);
  };



  // Woodhouse methods
  // ---

  // Log helper
  Woodhouse.log = function() {
    if (!Woodhouse.DEBUG || !console) {
      return;
    }

    console.log.apply(console, arguments);
  };

  // Error Helper
  Woodhouse.throwError = function(message, name) {
    var error = new Error(message);
    error.name = name || 'Error';
    throw error;
  };

  // Centralized XHR pool
  // Allows automatic aborting of pending XHRs when navigate is called
  Woodhouse.xhrs = [];
  Woodhouse.addXhr = function(xhr) {
    // Invalid xhr (or false)
    // Backbone sync will may return false
    if (!xhr) {
      return;
    }
    Woodhouse.xhrs.push(xhr);

    xhr.always(function() {
      var index = _.indexOf(Woodhouse.xhrs, this);
      if (index >= 0) {
        Woodhouse.xhrs.splice(index, 1);
      }
    }.bind(xhr));
  };

  // Woodhouse.Router
  // ---
  // Extends Backbone.Router
  Woodhouse.Router = Backbone.Router.extend({
    navigate: function(route, options) {
      options = options || {};

      // Don't navigate if route didn't change
      if (Backbone.history.fragment === route) {
        return this;
      }

      // Determine whether we should navigate
      if (!this.shouldNavigate(options)) {
        return this;
      }

      // This aborts all pending XHRs when Backbone tries to navigate
      _.each(Woodhouse.xhrs, function(xhr) {
        if (xhr.readyState && xhr.readyState > 0 && xhr.readyState < 4) {
          Woodhouse.log('XHR aborted due to router navigation');
          xhr.abort();
        }
      });
      Woodhouse.xhrs = [];
      if (options.force) {
        Backbone.history.fragment = null;
      }

      Backbone.history.navigate(route, options);
    },

    shouldNavigate: function(options) {
      return true;
    },
  });

  // Computed Properties
  Function.prototype.property = function() {
    var args = Array.prototype.slice.call(arguments);
    this.properties = args;
    return this;
  };


  // Woodhouse.Model
  // ---
  // Extends Backbone.DeepModel and adds support for:
  // Backbone.Model.oldset = Backbone.Model.prototype.set;
  //
  // - relations
  // - computed properties
  Woodhouse.Model = Backbone.Model.extend({
    constructor: function(attributes, options) {
      var attrs = attributes || {};
      options || (options = {});
      this.cid = _.uniqueId('c');
      this.attributes = {};
      if (options.collection) this.collection = options.collection;
      if (options.parse) attrs = this.parse(attrs, options) || {};
      attrs = _.defaults({}, attrs, _.result(this, 'defaults'));

      // Automatically create empty relations
      if (this.relations) {
        _.each(this.relations, function(relation) {
          if (!_.has(attrs, relation.key)) {
            attrs[relation.key] = relation.type === 'model' ? {} : [];
          }
        }.bind(this));
      }

      this.set(attrs, options);
      this.changed = {};
      this.initialize.apply(this, arguments);
    },

    // Tested and working with both shallow and deep keypaths
    get: function(attr) {
      if (!_.isString(attr)) {
        return undefined;
      }

      return this.getDeep(this.attributes, attr);
    },

    getDeep: function(attrs, attr) {
      var keys = attr.split('.');
      var isModel, isCollection;
      var key;
      var val = attrs;
      var context = this;

      for (var i = 0, n = keys.length; i < n; i++) {
        // determine if ??? is backbone model or collection
        isModel = val instanceof Backbone.Model;
        isCollection = val instanceof Backbone.Collection;

        // get key
        key = keys[i];

        // Hold reference to the context when diving deep into nested keys
        if (i > 0) {
          context = val;
        }

        // get value for key
        if (isCollection) {
          val = val.models[key];
        } else if (isModel) {
          val = val.attributes[key];
        } else {
          val = val[key];
        }

        // value for key does not exist
        // break out of loop early
        if (_.isUndefined(val) || _.isNull(val)) {
          break;
        }
      }

      // Eval computed properties that are functions
      if (_.isFunction(val)) {
        // Call it with the proper context (see above)
        val = val.call(context);
      }

      return val;
    },

    // Custom modified Backbone.Model.set to support relations
    set: function(key, val, options) {
      var attr, attrs, unset, changes, silent, changing, prev, current;
      if (_.isUndefined(key) || _.isNull(key)) {
        return this;
      }

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      unset = options.unset;
      silent = options.silent;
      changes = [];
      changing = this._changing;
      this._changing = true;

      if (!changing) {
        this._previousAttributes = this.deepClone(this.attributes);
        this.changed = {};
      }
      current = this.attributes, prev = this._previousAttributes;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      // For each `set` attribute, update or delete the current value.
      for (attr in attrs) {
        val = attrs[attr];

        if (!this.compareAttribute(current, attr, val)) {
          changes.push(attr);

          // Add any nested object key changes
          if (_.isObject(val) && !_.isArray(val)) {
            var nestedChanges = _.keys(this.objToPaths(val));
            _.each(nestedChanges, function(nestedChange) {
              changes.push(attr + '.' + nestedChange);
            });
          }
        }
        if (!this.compareAttribute(prev, attr, val)) {
          this.setAttribute(this.changed, attr, val, {
            changed: true
          });
        } else {
          this.unsetAttribute(this.changed, attr);
        }
        unset ? this.unsetAttribute(current, attr) : this.setAttribute(current, attr, val, {});
      }

      // Trigger all relevant attribute changes.
      var alreadyTriggered = {};
      if (!silent) {
        if (changes.length) this._pending = options;
        for (var i = 0, l = changes.length; i < l; i++) {
          if (!_.has(alreadyTriggered, changes[i])) {
            this.trigger('change:' + changes[i], this, this.getDeep(current, changes[i]), options);
            Woodhouse.log("model.%s set.trigger -> change:%s -> %s", this.cid, changes[i], JSON.stringify(this.getDeep(current, changes[i])));
            alreadyTriggered[changes[i]] = true;
          }

          // Trigger change events for parent keys with wildcard (*) notation
          var keys = changes[i].split('.');
          for (var n = keys.length - 1; n > 0; n--) {
            var parentKey = _.first(keys, n).join('.');
            var wildcardKey = parentKey + '.' + '*';

            if (!_.has(alreadyTriggered, wildcardKey)) {
              this.trigger('change:' + wildcardKey, this, this.getDeep(current, parentKey), options);
              Woodhouse.log("model.%s set.trigger -> change:%s -> %s", this.cid, wildcardKey, JSON.stringify(this.getDeep(current, parentKey)));
              alreadyTriggered[wildcardKey] = true;
            }
          }
        }
      }

      // Computed properties
      this.computedPropertyEvents(attrs);

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          options = this._pending;
          this._pending = false;
          this.trigger('change', this, options);
          Woodhouse.log("model.%s set.trigger -> change", this.cid);
        }
      }
      this._pending = false;
      this._changing = false;

      return this;
    },

    objToPaths: function(obj) {
      var ret = {};
      var separator = '.';

      _.each(obj, function(val, key) {
        if (_.isObject(val) && !_.isArray(val) && !_.isEmpty(val)) {
          //Recursion for embedded objects
          var obj2 = this.objToPaths(val);

          for (var key2 in obj2) {
            var val2 = obj2[key2];

            ret[key + separator + key2] = val2;
          }
        } else {
          ret[key] = val;
        }
      }.bind(this));

      return ret;
    },

    unflattenAttribute: function(attr, attrs) {
      var keys = attr.split('.');
      if (keys.length > 1) {
        var obj = {};
        var result = obj;
        for (var i = 0, n = keys.length; i < n; i++) {
          var key = keys[i];

          if (i === n - 1) {
            result[keys[i]] = attrs[attr];
          } else {
            //Create the child object if it doesn't exist, or isn't an object
            if (typeof result[key] === 'undefined' || !_.isObject(result[key])) {
              var nextKey = keys[i + 1];

              // create array if next key is integer, else create object
              result[key] = /^\d+$/.test(nextKey) ? [] : {};
            }

            //Move onto the next part of the path
            result = result[key];
          }
        }
        delete attrs[attr];
        _.extend(attrs, obj);
        return _.first(keys);

      }
      return attr;
    },

    compareAttribute: function(attrs, attr, val) {
      var oldVal = this.getDeep(attrs, attr);

      if (oldVal instanceof Backbone.Model) {
        oldVal = oldVal.attributes;
      } else if (oldVal instanceof Backbone.Collection) {
        oldVal = oldVal.models;
      }

      return _.isEqual(oldVal, val);
    },

    setAttribute: function(attrs, attr, val, options) {
      var keys = attr.split('.');
      var key;
      var result = attrs;
      var context = this;
      var relation;

      for (var i = 0, n = keys.length; i < n; i++) {
        // Hold reference to the context when diving deep into nested keys
        if (i > 0) {
          context = result;
        }

        // get key
        key = keys[i];

        // Look for a potential relation
        if (!options.changed && context.relations) {
          relation = _.findWhere(context.relations, {
            key: key
          });
        } else {
          relation = null;
        }

        // If the current root is a backbone model
        // The next level is under attributes
        if (result.attributes) {
          result = result.attributes;
        } else if (result.models) {
          result = result.models;
        }

        // last key
        if (i === n - 1) {
          if (relation && relation.type === 'model') {
            if (val.attributes) {
              val = val.attributes;
            }

            if (!(result[key] instanceof relation.model)) {
              result[key] = new relation.model(val);
            } else {
              result[key].set(val);
              // result[key].attributes = val;
            }
          } else if (relation && relation.type === 'collection') {
            if (val.models) {
              val = val.models;
            }

            if (!(result[key] instanceof relation.collection)) {
              result[key] = new relation.collection(val);
            } else {
              result[key].reset(val);
            }
          } else {
            if (result[key] && _.isFunction(result[key].set)) {
              result[key].set(val);
            } else {
              result[key] = val;
            }
          }
        } else { // not last key
          // if key is undefined and relation exists, create an empty model
          // if key is undefined and no relation exists, create an empty object
          if (_.isUndefined(result[key]) || _.isNull(result[key])) {
            result[key] = relation ? new relation.model() : {};
          }

          // dive another level
          result = result[key];
        }
      }
    },

    unsetAttribute: function(attrs, attr) {
      var isModel, isCollection;
      var keys = attr.split('.');
      var key;
      var val = attrs;
      var isLastKey = false;

      for (var i = 0, n = keys.length; i < n; i++) {
        isModel = val instanceof Backbone.Model;
        isCollection = val instanceof Backbone.Collection;

        key = keys[i];

        if (i === n - 1) {
          isLastKey = true;
        }

        if (isCollection) {
          if (isLastKey) {
            val.remove(val.models[key]);
          } else {
            val = val.models[key];
          }
        } else if (isModel) {
          if (isLastKey) {
            delete val.attributes[key];
          } else {
            val = val.attributes[key];
          }
        } else {
          if (isLastKey) {
            delete val[key];
          } else {
            val = val[key];
          }
        }

        // value for key does not exist
        // break out of loop early
        if (_.isUndefined(val) || _.isNull(val)) {
          break;
        }
      }
    },

    hasChanged: function(attr) {
      if (_.isUndefined(attr) || _.isNull(attr)) {
        return !_.isEmpty(this.changed);
      }
      return !_.isUndefined(this.getDeep(this.changed, attr));
    },

    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? this.deepClone(this.changed) : false;
      var val, changed = false;
      var old = this._changing ? this._previousAttributes : this.attributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (_.isUndefined(attr) || _.isNull(attr) || !this._previousAttributes) {
        return null;
      }

      return this.getDeep(this._previousAttributes, attr);
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return this.deepClone(this._previousAttributes);
    },

    // Attach event listeners to the raw properties of the computed property
    computedPropertyEvents: function(attrs) {
      var attr;
      for (attr in attrs) {
        var events = "";
        var val = attrs[attr];
        if (!_.isFunction(val)) {
          continue;
        }

        _.each(val.properties, function(property) {
          var key = attr;
          var fn = val;
          var entity = this.get(property);
          if (entity instanceof Backbone.Collection) {
            events = "change reset add remove sort";
          } else if (entity instanceof Backbone.Model) {
            events = "change";
          } else {
            entity = this;
            events = "change:" + property;
          }

          this.listenTo(entity, events, function() {
            var value = fn.call(this);
            this.trigger('change:' + key, this, value);
          }.bind(this));
        }.bind(this));
      }
    },

    // Borrowed from backbone-deep-model
    deepClone: function(obj) {
      var func, isArr;
      if (!_.isObject(obj) || _.isFunction(obj)) {
        return obj;
      }
      if (obj instanceof Backbone.Collection || obj instanceof Backbone.Model) {
        return obj;
      }
      if (_.isDate(obj)) {
        return new Date(obj.getTime());
      }
      if (_.isRegExp(obj)) {
        return new RegExp(obj.source, obj.toString().replace(/.*\//, ""));
      }
      isArr = _.isArray(obj || _.isArguments(obj));
      func = function(memo, value, key) {
        if (isArr) {
          memo.push(this.deepClone(value));
        } else {
          memo[key] = this.deepClone(value);
        }
        return memo;
      }.bind(this);
      return _.reduce(obj, func, isArr ? [] : {});
    },

    // Override toJSON to support relations and computed properties
    toJSON: function(options) {
      var json = this.deepClone(this.attributes);

      // Convert all relations from models/collections to objects/arrays
      if (this.relations) {
        _.each(this.relations, function(relation) {
          var object;

          // Look for embedded relations
          if (_.has(json, relation.key)) {
            // If the value is a model or collection and has a toJSON function
            if (json[relation.key] instanceof Backbone.Model || json[relation.key] instanceof Backbone.Collection) {
              json[relation.key] = json[relation.key].toJSON(options);
            }
          } else {
            if (relation.type === 'collection') {
              json[relation.key] = [];
            } else if (relation.type === 'model') {
              json[relation.key] = {};
            }
          }
        }.bind(this));
      }

      // Remove computed properties from output
      _.each(json, function(val, key) {
        if (_.isFunction(val)) {
          delete json[key];
        }
      });

      return json;
    }
  });


  // Woodhouse.Model
  // ---
  // Extends Backbone.Collection and sets default model class to Woodhouse.Model
  Woodhouse.Collection = Backbone.Collection.extend({
    model: Woodhouse.Model,

    // Proxy for Array's move method and also fires a `sort` event
    move: function() {
      Array.prototype.move.apply(this.models, arguments);
      this.trigger('sort', this);
      return this;
    }
  });


  // Woodhouse.Region
  // ---
  //
  // This is like a UIViewController
  // It has a property `view` that is shown in the DOM at location of the property `el`
  // If the region is closed via the `close` method, the `view` will be removed by calling it's `remove` method
  // If a region shows a view and an existing different view is currently being shown, it will be closed
  //
  // Instance Options/Attributes
  // Prototype Properties and Methods
  // onBeforeShow
  // onShow
  // onBeforeClose
  // onClose
  Woodhouse.Region = function(options) {
    this.cid = _.uniqueId('region');
    options = options || {};
    _.extend(this, _.pick(options, ['el']));

    if (!this.el) {
      var err = new Error("An 'el' must be specified for a region.");
      err.name = "NoElError";
      throw err;
    }

    this.ensureEl();

    this.initialize.apply(this, arguments);
  };

  // Allow Woodhouse.Region to be extendable like Backbone.View
  Woodhouse.Region.extend = Backbone.View.extend;

  // Add methods to the prototype of Woodhouse.Region
  _.extend(Woodhouse.Region.prototype, Backbone.Events, {
    initialize: function() {},

    // Converts el to $el using the DOM manipulator
    ensureEl: function() {
      if (!this.$el || this.$el.length === 0) {
        this.$el = Woodhouse.$(this.el);
      }
    },

    // Determines if the region is showing a view or not
    isShowing: function() {
      return this.view ? true : false;
    },

    // Show a view in the region
    // This will replace any previous view shown in the region
    // options - object
    //  render - boolean - default true, whether the view should be rendered after show
    show: function(view, options) {
      options = options || {};
      _.defaults(options, {
        render: true
      });

      // Remove previous view if the new view is different by closing region
      if (this.view && this.view !== view) {
        this.close();
      }

      // Set current view
      this.view = view;

      // Set the view's region
      view.region = this;

      // This method gets called BEFORE show
      if (_.isFunction(this.onBeforeShow)) {
        this.onBeforeShow();
      }

      // Append the view DOM el into the region at the DOM location specified by `el`
      this.$el.empty()
        .append(view.el);

      // Render the view
      if (options.render) {
        view.render.call(view);
      }

      // This method gets called AFTER show
      if (_.isFunction(this.onShow)) {
        this.onShow();
      }

      return this;
    },

    // Remove the current view in the region
    close: function() {
      // This method gets called BEFORE close
      if (_.isFunction(this.onBeforeClose)) {
        this.onBeforeClose();
      }

      // Remove the view and null it
      if (this.view) {
        this.view.remove.call(this.view);
      }
      this.view = null;

      // This method gets called AFTER close
      if (_.isFunction(this.onClose)) {
        this.onClose();
      }

      // If this region has a loading view, show it now
      this.showLoading();

      return this;
    },

    // Show the loading view if it exists
    showLoading: function() {
      if (this.loadingView) {
        this.show(this.loadingView);
      }
    },

    // Alias for `close`
    reset: function() {
      return this.close();
    }

  });

  // Woodhouse.View
  // ---
  //
  // Properties
  // subviews - Array of Woodhouse.View
  // superview - Woodhouse.View
  //
  // Options (arguments passed in to constructor are added to the property `options` object)
  // locals - Object or Function - Properties that get mixed into the template context during template evaluation
  //
  // Prototype
  // template - Function - required - compiled template function (handlebars, etc...)
  // onBeforeRender - Function - optional
  // onRender - Function - optional
  // onBeforeRemove - Function - optional
  // onRemove - Function - optional

  // Principles
  // ---
  // Render should be able to be called multiple times without side effects.
  // The order of the DOM should be declared in templates, not Javascript.
  // Calling render again should maintain the state the view was in.
  // Rendering twice shouldn’t trash views just to re-construct them again.
  // Rending multiple times should properly detach and attach event listeners
  Woodhouse.View = Backbone.View.extend({
    constructor: function(options) {
      // this exposes view options to the view initializer
      // this is a backfill since backbone removed the assignment of this.options
      this.options = _.extend({}, this.options, options);
      Backbone.View.prototype.constructor.apply(this, arguments);
    },

    // Because Backbone only allows certain view options to become properties,
    // we store the rest of them in the options property.
    // This is a convenience accessor to get a property that either belongs to the view or is in options
    getOption: function(property) {
      var value;

      if (this.options && (property in this.options) && (this.options[property] !== undefined)) {
        value = this.options[property];
      } else {
        value = this[property];
      }

      return value;
    },

    // Wraps the context with a model or collection for the events system
    wrapContext: function(context) {
      if (context && !_.isFunction(context) && _.isUndefined(context.on)) {
        if (_.isArray(context)) {
          context = new Woodhouse.Collection(context);
        } else if (_.isObject(context)) {
          context = new Woodhouse.Model(context);
        }
      } else if (_.isUndefined(context) || _.isNull(context)) {
        Woodhouse.log("*** Does this ever happen?");
        // Just plane doesn't exist
        context = new Woodhouse.Collection();
      }
      return context;
    },

    getContext: function(options) {
      options = options || {};

      // If a context keypath is provided, override the context relative to the view
      if (options.view) {
        return this[options.view];
      }

      // If binding to a collection instead of model
      if (options.collection) {
        return options.collection;
      }

      // No keypath, return model
      if (_.isUndefined(options.keypath) || _.isNull(options.keypath)) {
        return options.model;
      }

      var context = options.model.get(options.keypath);

      if (!context) {
        if (options.model.relations && _.isArray(options.model.relations)) {
          _.each(options.model.relations, function(relation) {
            if (options.keypath === relation.key) {
              if (relation.type === 'collection') {
                context = new relation.collection();
              } else {
                context = new relation.model();
              }
            }
          }.bind(this));
        }
      }

      // Move wrap context here
      // context = this.wrapContext(context);

      return context;
    },


    // Templating
    // ---
    //
    // Evaluates a compiled template with context
    // TODO allow string templates to be evaluated on-the-fly
    evaluateTemplate: function(template) {
      return template(this.templateContext());
    },

    // Build the template context from model, collection, and locals
    templateContext: function() {
      // Populate model and collection properties with model and collection attributes
      var context = {
        model: this.model ? this.model.toJSON() : {},
        collection: this.collection ? this.collection.toJSON() : {}
      };

      // Mixin template locals
      var locals = this.getOption('locals') || {};
      if (_.isFunction(locals)) {
        locals = locals.call(this);
      }
      _.extend(context, locals);

      return context;
    },


    // View Bindings
    // ---
    //
    // Add bindings declared with the `bind-*` attribute
    // `this` should always refer to the `view`
    //
    // TODO
    // - `bind-focus`
    // - `bind-css`
    //
    // - binding to nested keypaths that don't exist will NOT create them like a set will
    // - example: `bind-val="payment_source.card"` but payment_source does not have the key `card`
    // - pass back options in transformers
    //
    // Options:
    // - `el` is the root DOM element to bind to
    // - `model` is the Model or Collection to bind to
    // - `index` is the integer index when in the loop
    // - `keypathPrefix` is the prefix for keypath when in the loop
    addBindings: function(options) {
      // No el, no bind!
      if (!options.el) {
        return [];
      }


      // Variables
      var $el = $(options.el); // just for convenience
      var bindings = []; // keeps track of all bindings, returned by function


      // Binding functions/handlers
      var fns = {
        // Attr
        // Syntax: `bind-attr-*="keypath"`
        // Direction: Model-to-View
        bindAttr: function(bindEl, attrName, attrValue) {
          // Delayed removal of attributes
          var attributesToRemove;

          // Loop thru all attributes
          _.each(bindEl.attributes, function(attribute) {
            if (attribute.name.indexOf('bind-attr-') < 0) {
              return;
            }

            // Found a [bind-attr-*] attribute
            var $bindEl = $(bindEl);
            var attr = attribute.name.replace('bind-attr-', '');
            var keypath = $bindEl.attr(attribute.name);
            var keypathWithPrefix = (options.keypathPrefix ? options.keypathPrefix + '.' + keypath : keypath).replace('this.', '');
            var modelEvents = 'change:' + keypath;
            var offset = 0;

            // Context
            var context = this.getContext({
              model: options.model,
              view: $bindEl.attr('bind-attr-context')
            });

            // Binding
            var modelToView = function(model, value) {
              // Eval if value is a function
              if (_.isFunction(value)) {
                value = value.call(model);
              }

              // Check for any transformers
              var transformersFn = this.transformers && this.transformers.modelToView;
              if (transformersFn && _.isFunction(transformersFn[keypathWithPrefix])) {
                value = transformersFn[keypathWithPrefix].call(this, value, model);
              }

              $bindEl.attr(attr, value);
            }.bind(this);

            // Delayed removal of attributes
            attributesToRemove = attributesToRemove || [];
            attributesToRemove.push(attribute.name);

            // If all we need is the index
            if (keypath === '$index') {
              var index = options.index + (parseInt($bindEl.attr('bind-index-offset'), 10) || 0);
              var transformersFn = this.transformers && this.transformers.index;
              if (transformersFn && _.isFunction(transformersFn[keypathWithPrefix])) {
                index = transformersFn[keypathWithPrefix].call(this, index);
              }
              return $bindEl.attr(attr, index);
            }

            // Store binding for removal later
            bindings.push({
              object: context,
              events: modelEvents,
              handler: modelToView
            });

            // Bind model-to-view
            context.on(modelEvents, modelToView);
            modelToView(context, context.get(keypath));
          }.bind(this));

          // Delayed removal of attributes
          if (attributesToRemove) {
            _.each(attributesToRemove, function(attributeToRemove) {
              $(bindEl)
                .removeAttr(attributeToRemove);
            });
          }
        }.bind(this),


        // Repeat (ARRAY ONLY)
        // Syntax: `bind-array="keypath"`
        // Direction: N/A
        // Expects an Array not a Collection
        bindArray: function(bindEl, attrName, attrValue) {
          var $bindEl = $(bindEl);
          var $parentEl = $bindEl.parent();
          var $childEls = $();
          var direction = $bindEl.attr('bind-array-direction');
          var keypath = attrValue;
          var modelEvents = 'change:' + keypath;

          // Context
          var context = this.getContext({
            model: options.model,
            view: $bindEl.attr('bind-array-context')
          });

          // Remove attribute
          $bindEl.removeAttr(attrName);

          // The binding function
          var modelToView = function(model, value) {
            var $childEl;

            // Eval if value is a function
            if (_.isFunction(value)) {
              value = value.call(model);
            }

            // Clear select container
            $childEls.remove();
            $childEls = $();

            // Value can be either an `array of strings` or a `collection`
            for (var i = 0; i < value.length; i++) {
              // Make a copy of the detached item
              $childEl = $bindEl.clone();

              $childEl.text(value[i]);

              $.merge($childEls, $childEl);
            }

            // Append item to parent container
            if (direction && direction === 'append') {
              $childEls.appendTo($parentEl);
            } else {
              $childEls.prependTo($parentEl);
            }
          }.bind(this);

          // Detach from DOM and cache it
          $bindEl.detach();

          // Store binding for removal later
          bindings.push({
            object: context,
            events: modelEvents,
            handler: modelToView
          });

          // Bind model-to-view
          context.on(modelEvents, modelToView);
          modelToView(context, context.get(keypath));
        }.bind(this),


        // With
        // Syntax: `bind-with="keypath"`
        bindWith: function(bindEl, attrName, attrValue) {
          var $bindEl = $(bindEl);
          var keypath = attrValue;
          var childBindings = [];
          var keypathPrefix = options.keypathPrefix ? options.keypathPrefix + '.' + keypath : keypath;

          // Context
          var context = this.getContext({
            model: options.model,
            keypath: keypath,
            view: $bindEl.attr('bind-with-context')
          });

          // Eval if value is a function
          if (_.isFunction(context)) {
            context = context.call(options.model);
          }

          // Remove attribute
          $bindEl.removeAttr(attrName);

          // Remove child bindings
          this.childBindings = _.difference(this.childBindings, childBindings);
          this.removeBindings(childBindings);

          childBindings = childBindings.concat(this.addBindings({
            el: $bindEl,
            model: context,
            keypathPrefix: keypathPrefix
          }));

          // Add child bindings for removal later
          this.childBindings = this.childBindings || [];
          this.childBindings = this.childBindings.concat(childBindings);

          if (childBindings.length > 0) {
            Woodhouse.log("View: %s, Added %d bindings isChild: true, isIf: true", this.cid, childBindings.length);
          }
        }.bind(this),


        // If/Unless
        // Syntax: `bind-if="keypath"`
        bindIfUnless: function(bindEl, attrName, attrValue) {
          var $bindEl = $(bindEl);
          var keypath = attrValue;
          var modelEvents = 'change:' + keypath;
          var childBindings = [];

          // Context
          var context = this.getContext({
            model: options.model,
            view: $bindEl.attr('bind-if-context') || $bindEl.attr('bind-unless-context')
          });

          // Remove attribute
          $bindEl.removeAttr(attrName);

          // Make a clone and remove the original element
          var $contents = $bindEl.contents().clone();
          $bindEl.contents().empty().remove();

          // Binding function
          var modelToView = function(model, value) {
            // Remove child bindings
            this.childBindings = _.difference(this.childBindings, childBindings);
            this.removeBindings(childBindings);

            // Clear container
            $bindEl.empty();

            // Eval if value is a function
            if (_.isFunction(value)) {
              value = value.call(model);
            }

            value = Boolean(value);

            if (attrName === 'bind-unless') {
              value = !value;
            }

            // Element should be active
            if (value) {
              var $childEl = $contents.clone();
              $bindEl.append($childEl);

              childBindings = childBindings.concat(this.addBindings({
                el: $childEl,
                model: model
              }));

              // Add child bindings for removal later
              this.childBindings = this.childBindings || [];
              this.childBindings = this.childBindings.concat(childBindings);

              if (childBindings.length > 0) {
                Woodhouse.log("View: %s, Added %d bindings isChild: true, isIf: true", this.cid, childBindings.length);
              }
            }
          }.bind(this);

          // Store binding for removal later
          bindings.push({
            object: context,
            events: modelEvents,
            handler: modelToView
          });


          // Bind model-to-view
          context.on(modelEvents, modelToView);
          modelToView(context, context.get(keypath));
        }.bind(this),


        // Each (COLLECTION ONLY)
        // Syntax: `bind-each="keypath"`
        // Direction: N/A
        // Note: a value of `this` behaves specially
        // Note: this binding needs to be parsed before all other bindings
        bindEach: function(bindEl, attrName, attrValue) {
          var $bindEl = $(bindEl);
          var direction = $bindEl.attr('bind-each-direction');
          var keypath = attrValue;
          var addEvents = 'add';
          var removeEvents = 'remove';
          var resetSortEvents = 'reset sort';
          var childBindings = [];
          var childElBindings = [];
          var $childEls = $();

          // Context
          var context = this.getContext({
            model: options.model,
            collection: keypath === 'this' ? options.collection : null,
            keypath: keypath,
            view: $bindEl.attr('bind-each-context')
          });

          // Eval if value is a function
          if (_.isFunction(context)) {
            context = context.call(options.model);
          }

          // Remove attribute
          $bindEl.removeAttr(attrName);

          // Clone and replace
          var $child = $bindEl.children().first().clone();
          $bindEl.children().first().remove();
          var $children = $bindEl.children();

          // Add bindings to rest of the children that aren't repeated (placeholders)
          // This goes to the parent binding because it doesn't get repeated
          bindings = bindings.concat(this.addBindings({
            el: $children,
            model: options.model
          }));

          // Reset and Sort (multiple models at a time)
          var bindResetSort = function(collection, opts) {
            var $childEl;
            var isSelect = $bindEl.is('select');
            var keypathPrefix = options.keypathPrefix ? options.keypathPrefix + '.' + keypath : keypath;

            // Remove child bindings
            this.childBindings = _.difference(this.childBindings, childBindings);
            this.removeBindings(childBindings);

            // Clear parent container
            var previousVal = isSelect ? $bindEl.val() : null;
            $childEls.remove();
            $childEls = $();

            // For each Model (child) in the Collection (parent), add bindings
            for (var i = 0; i < collection.length; i++) {
              // Make a copy of the detached item
              $childEl = $child.clone();

              $.merge($childEls, $childEl);

              // Add bindings to the child
              var newChildBindings = this.addBindings({
                el: $childEl,
                model: collection.at(i),
                parent: options.model,
                index: i,
                keypathPrefix: keypathPrefix
              });
              childBindings = childBindings.concat(newChildBindings);

              childElBindings.push({
                el: $childEl,
                bindings: newChildBindings
              });
            }

            // Append child to parent container
            if (direction && direction === 'prepend') {
              $childEls.prependTo($bindEl);
            } else {
              $childEls.appendTo($bindEl);
            }

            // Restore previous select val
            if (isSelect) {
              $bindEl.val(previousVal);
            }

            // Add child bindings for removal later
            this.childBindings = this.childBindings || [];
            this.childBindings = this.childBindings.concat(childBindings);

            if (childBindings.length > 0) {
              Woodhouse.log("View: %s, Added %d child bindings", this.cid, childBindings.length);
            }
          }.bind(this);

          // Adding one model at a time
          var bindAdd = function(model, collection, opts) {
            var $childEl = $child.clone();
            var index = collection.indexOf(model);
            var keypathPrefix = options.keypathPrefix ? options.keypathPrefix + '.' + keypath : keypath;

            $bindEl.insertAt(index, $childEl);
            $childEls.splice(index, 0, $childEl.get(0));

            // Add bindings to the child
            var newChildBindings = this.addBindings({
              el: $childEl,
              model: model,
              parent: options.model,
              index: index,
              keypathPrefix: keypathPrefix
            });
            childBindings = childBindings.concat(newChildBindings);

            childElBindings.push({
              el: $childEl,
              bindings: newChildBindings
            });

            // Add child bindings for removal later
            this.childBindings = this.childBindings || [];
            this.childBindings = this.childBindings.concat(childBindings);

            if (childBindings.length > 0) {
              Woodhouse.log("View: %s, Added %d bindings isChild: true", this.cid, childBindings.length);
            }
          }.bind(this);

          // Removing one or more models at a time
          var bindRemove = function(model, collection, opts) {
            var index = opts.index;

            // find the child element to remove
            var $removedEl = $($childEls.splice(index, 1));

            // locate any child bindings
            var matchedChildElBinding;
            for (var i = 0, n = childElBindings.length; i < n; i++) {
              if (childElBindings[i].el.is($removedEl)) {
                matchedChildElBinding = childElBindings[i];
                break;
              }
            }

            // remove child bindings
            if (matchedChildElBinding) {
              childBindings = _.difference(childBindings, matchedChildElBinding.bindings);
              this.childBindings = _.difference(this.childBindings, matchedChildElBinding.bindings);
              this.removeBindings(matchedChildElBinding.bindings);
              childElBindings.splice(childElBindings.indexOf(matchedChildElBinding), 1);
            }

            // remove the child element
            $removedEl.remove();
          }.bind(this);

          // Store binding for removal later
          bindings.push({
            object: context,
            events: addEvents,
            handler: bindAdd
          });

          bindings.push({
            object: context,
            events: removeEvents,
            handler: bindRemove
          });

          bindings.push({
            object: context,
            events: resetSortEvents,
            handler: bindResetSort
          });


          // Bind
          context.on(addEvents, bindAdd);
          context.on(removeEvents, bindRemove);
          context.on(resetSortEvents, bindResetSort);
          bindResetSort(context, {});
        }.bind(this),


        // Text/HTML
        // Syntax: `bind-text="keypath"` and `bind-html="keypath"`
        // Direction: Model-to-View, View-to-Model
        // Note: Browser compat on View-to-Model might be poor
        bindTextAndHtml: function(bindEl, attrName, attrValue) {
          var $bindEl = $(bindEl);
          var keypath = attrValue;
          var keypathWithPrefix = (options.keypathPrefix ? options.keypathPrefix + '.' + keypath : keypath).replace('this.', '');
          var modelEvents = 'change:' + keypath;
          var viewEvents = 'input';
          var offset = 0;

          // Added support for `../` to reference a parent!
          var model = options.model;
          if (/..\//.test(keypath)) {
            model = options.parent;
            keypath = keypath.replace('../', '');
          }

          // Context
          var context = this.getContext({
            model: model,
            view: $bindEl.attr('bind-text-context') || $bindEl.attr('bind-html-context')
          });

          // Remove attribute
          $bindEl.removeAttr(attrName);

          var modelToView = function(model, value) {
            // Eval if value is a function
            if (_.isFunction(value)) {
              value = value.call(model);
            }

            // Check for any transformers
            var transformersFn = this.transformers && this.transformers.modelToView;
            if (transformersFn && _.isFunction(transformersFn[keypathWithPrefix])) {
              value = transformersFn[keypathWithPrefix].call(this, value, model);
            }

            // Set the value for the element if it has changed
            var fn = (attrName === 'bind-html') ? 'html' : 'text';
            if ($bindEl[fn]() !== value) {
              $bindEl[fn](value);
            }

            Woodhouse.log("Binding: %s, Model Attribute Change: %s", attrName, keypathWithPrefix);
          }.bind(this);

          var viewToModel = function(e) {
            var fn = (attrName === 'bind-html') ? 'html' : 'text';
            var value = $bindEl[fn]();

            var transformersFn = this.transformers && this.transformers.viewToModel;
            if (transformersFn && _.isFunction(transformersFn[keypathWithPrefix])) {
              value = transformersFn[keypathWithPrefix].call(this, value);
            }

            if (!_.isFunction(context.get(keypath))) {
              context.set(keypath, value);
            }

            Woodhouse.log("Binding: %s, View Event: %s", attrName, e.type);
          }.bind(this);


          // If all we need is the index
          if (keypath === '$index') {
            var index = options.index + (parseInt($bindEl.attr('bind-index-offset'), 10) || 0);
            var transformersFn = this.transformers && this.transformers.index;
            if (transformersFn && _.isFunction(transformersFn[keypathWithPrefix])) {
              index = transformersFn[keypathWithPrefix].call(this, index);
            }
            return $bindEl.text(index);
          }

          // Store model binding for removal later
          bindings.push({
            object: context,
            events: modelEvents,
            handler: modelToView
          });

          // Store view binding for removal later
          bindings.push({
            object: $bindEl,
            modelEvents: viewEvents,
            handler: viewToModel
          });

          // Bind view-to-model
          $bindEl.on(viewEvents, viewToModel);


          // Bind model-to-view
          context.on(modelEvents, modelToView);
          modelToView(context, context.get(keypath));
        }.bind(this),


        // Val
        // Syntax: `bind-val="keypath"`
        // Direction: Model-to-View, View-to-Model
        // NOTE: Selenium seems to NOT respond well to `textchange`
        bindVal: function(bindEl, attrName, attrValue) {
          var $bindEl = $(bindEl);
          var keypath = attrValue;
          var keypathWithPrefix = (options.keypathPrefix ? options.keypathPrefix + '.' + keypath : keypath).replace('this.', '');
          var isSelect = $bindEl.is('select');
          var modelEvents = 'change:' + keypath;
          var viewEvents = isSelect ? 'change' : 'textchange';
          // Override events
          viewEvents = $bindEl.attr('bind-val-events') ? $bindEl.attr('bind-val-events') : viewEvents;

          // Context
          var context = this.getContext({
            model: options.model,
            view: $bindEl.attr('bind-val-context')
          });

          // Remove attribute
          $bindEl.removeAttr(attrName);

          // Binding function
          var modelToView = function(model, value) {
            // Eval if value is a function
            if (_.isFunction(value)) {
              value = value.call(model);
            }

            var transformersFn = this.transformers && this.transformers.modelToView;
            if (transformersFn && _.isFunction(transformersFn[keypathWithPrefix])) {
              value = transformersFn[keypathWithPrefix].call(this, value, model);
            }

            if ($bindEl.val() !== value) {
              $bindEl.val(value);
            }

            Woodhouse.log("Binding: %s, Model Attribute Change: %s", attrName, keypathWithPrefix);
          }.bind(this);

          var viewToModel = function(e) {
            var value = $bindEl.val();

            var transformersFn = this.transformers && this.transformers.viewToModel;
            if (transformersFn && _.isFunction(transformersFn[keypathWithPrefix])) {
              value = transformersFn[keypathWithPrefix].call(this, value);
            }

            if (!_.isFunction(context.get(keypath))) {
              context.set(keypath, value);
            }

            Woodhouse.log("Binding: %s, View Event: %s", attrName, e.type);
          }.bind(this);

          // Store binding for removal later
          bindings.push({
            object: context,
            events: modelEvents,
            handler: modelToView
          });

          // Store binding for removal later
          bindings.push({
            object: $bindEl,
            events: viewEvents,
            handler: viewToModel
          });

          // Bind view-to-model
          $bindEl.on(viewEvents, viewToModel);

          // Bind model-to-view
          context.on(modelEvents, modelToView);
          modelToView(context, context.get(keypath));
        }.bind(this),


        // Checked
        // Syntax: `bind-checked="keypath"`
        // Direction: Model-to-View, View-to-Model
        bindChecked: function(bindEl, attrName, attrValue) {
          var $bindEl = $(bindEl);
          var keypath = attrValue;
          var modelEvents = 'change:' + keypath;
          var viewEvents = 'change';

          // Context
          var context = this.getContext({
            model: options.model,
            view: $bindEl.attr('bind-checked-context')
          });

          // Remove attribute
          $bindEl.removeAttr(attrName);

          // Binding function
          var modelToView = function(model, value) {
            // Eval if value is a function
            if (_.isFunction(value)) {
              value = value.call(model);
            }

            value = Boolean(value);

            if ($bindEl.prop('checked') !== value) {
              $bindEl.prop('checked', value);
            }
          }.bind(this);

          var viewToModel = function(e) {
            var value = $bindEl.prop('checked');
            value = Boolean(value);

            if (!_.isFunction(context.get(keypath))) {
              context.set(keypath, value);
            }
          }.bind(this);

          // Store binding for removal later
          bindings.push({
            object: context,
            events: modelEvents,
            handler: modelToView
          });

          // Store binding for removal later
          bindings.push({
            object: $bindEl,
            events: viewEvents,
            handler: viewToModel
          });


          // Bind view-to-model
          $bindEl.on(viewEvents, viewToModel);


          // Bind model-to-view
          context.on(modelEvents, modelToView);
          modelToView(context, context.get(keypath));
        }.bind(this),


        // Visible/Hidden
        // Syntax: `bind-visible="keypath"` and `bind-hidden="keypath"`
        // Direction: Model-to-View
        bindVisibleAndHidden: function(bindEl, attrName, attrValue) {
          var $bindEl = $(bindEl);
          var keypath = attrValue;
          var modelEvents = 'change:' + keypath;

          // Context
          var context = this.getContext({
            model: options.model,
            view: $bindEl.attr('bind-visible-context') || $bindEl.attr('bind-hidden-context')
          });

          // Remove attribute
          $bindEl.removeAttr(attrName);

          var modelToView = function(model, value) {
            // Eval if value is a function
            if (_.isFunction(value)) {
              value = value.call(model);
            }

            value = Boolean(value);

            if (attrName === 'bind-hidden') {
              value = !value;
            }

            $bindEl.toggle(value);
          }.bind(this);

          // Store binding for removal later
          bindings.push({
            object: context,
            events: modelEvents,
            handler: modelToView
          });


          // Bind model-to-view
          context.on(modelEvents, modelToView);
          modelToView(context, context.get(keypath));
        }.bind(this),


        // Enable/Disable
        // Syntax: `bind-enabled="keypath"` and `bind-disabled="keypath"`
        // Direction: Model-to-View
        bindEnableAndDisable: function(bindEl, attrName, attrValue) {
          var $bindEl = $(bindEl);
          var keypath = attrValue;
          var modelEvents = 'change:' + keypath;

          // Context
          var context = this.getContext({
            model: options.model,
            view: $bindEl.attr('bind-enabled-context') || $bindEl.attr('bind-disabled-context')
          });

          // Remove attribute
          $bindEl.removeAttr(attrName);

          var modelToView = function(model, value) {
            // Eval if value is a function
            if (_.isFunction(value)) {
              value = value.call(model);
            }

            value = Boolean(value);

            if (attrName === 'bind-disabled') {
              value = !value;
            }

            $bindEl.prop('disabled', !value);
          }.bind(this);

          // Store binding for removal later
          bindings.push({
            object: context,
            events: modelEvents,
            handler: modelToView
          });


          // Bind model-to-view
          context.on(modelEvents, modelToView);
          modelToView(context, context.get(keypath));
        }.bind(this),


        // Click/Submit
        // Syntax: `bind-click="fn"` and `bind-submit="fn"`
        // Direction: N/A
        // `context` is ALWAYS the `view`
        bindClickAndSubmit: function(bindEl, attrName, attrValue) {
          var $bindEl = $(bindEl);
          var fn = attrValue;
          var viewEvents = (attrName === 'bind-submit') ? 'submit' : 'click';

          // Override context
          var context = this;

          // If a context keypath is provided, override the context relative to the view
          if ($bindEl.attr('bind-click-context')) {
            context = this[$bindEl.attr('bind-click-context')];
          }
          if ($bindEl.attr('bind-submit-context')) {
            context = this[$bindEl.attr('bind-submit-context')];
          }

          // Remove attribute
          $bindEl.removeAttr(attrName);

          if (!_.isFunction(context[fn])) {
            return;
          }

          var bindFn = function(e) {
            context[fn].call(context, e, options);
          }.bind(this);

          // Store binding for removal later
          bindings.push({
            object: $bindEl,
            events: viewEvents,
            handler: bindFn
          });

          // Initial binding
          $bindEl.on(viewEvents, bindFn);
        }.bind(this),
      };


      // Parse DOM for bindings
      // Get all `bind elements` that match the `binding attributes`
      var $bindEls = $.merge($el, $el.find('*'));
      $bindEls = $bindEls.filter(function(index, el) {
        return !_.isEmpty(this.getBindAttributes(el));
      }.bind(this))
        .not('[bind-each] *')
        .not('[bind-if] *')
        .not('[bind-unless] *');

      // Loop
      // Shift all `bind elements` until empty
      // Bind them in order
      while ($bindEls.length > 0) {
        var bindEl = $bindEls.get(0);
        $bindEls.splice(0, 1);

        // This should not happen
        if (!bindEl) {
          return;
        }

        // All other bindings
        var bindAttrs = [];
        $.each(bindEl.attributes, function(attrIndex, attr) {
          bindAttrs.push({
            name: attr.name,
            value: attr.value
          });
        }.bind(this));

        // Map them to a `binding handler`
        _.each(bindAttrs, function(bindAttr) {
          switch (bindAttr.name) {
            case 'bind-each':
              fns.bindEach.call(this, bindEl, bindAttr.name, bindAttr.value);
              break;
            case 'bind-array':
              fns.bindArray.call(this, bindEl, bindAttr.name, bindAttr.value);
              break;
            case 'bind-with':
              fns.bindWith.call(this, bindEl, bindAttr.name, bindAttr.value);
              break;
            case 'bind-if':
              fns.bindIfUnless.call(this, bindEl, bindAttr.name, bindAttr.value);
              break;
            case 'bind-unless':
              fns.bindIfUnless.call(this, bindEl, bindAttr.name, bindAttr.value);
              break;
            case 'bind-text':
              fns.bindTextAndHtml.call(this, bindEl, bindAttr.name, bindAttr.value);
              break;
            case 'bind-html':
              fns.bindTextAndHtml.call(this, bindEl, bindAttr.name, bindAttr.value);
              break;
            case 'bind-val':
              fns.bindVal.call(this, bindEl, bindAttr.name, bindAttr.value);
              break;
            case 'bind-checked':
              fns.bindChecked.call(this, bindEl, bindAttr.name, bindAttr.value);
              break;
            case 'bind-visible':
              fns.bindVisibleAndHidden.call(this, bindEl, bindAttr.name, bindAttr.value);
              break;
            case 'bind-hidden':
              fns.bindVisibleAndHidden.call(this, bindEl, bindAttr.name, bindAttr.value);
              break;
            case 'bind-enabled':
              fns.bindEnableAndDisable.call(this, bindEl, bindAttr.name, bindAttr.value);
              break;
            case 'bind-disabled':
              fns.bindEnableAndDisable.call(this, bindEl, bindAttr.name, bindAttr.value);
              break;
            case 'bind-click':
              fns.bindClickAndSubmit.call(this, bindEl, bindAttr.name, bindAttr.value);
              break;
            case 'bind-submit':
              fns.bindClickAndSubmit.call(this, bindEl, bindAttr.name, bindAttr.value);
              break;
            default:
              // Catch all `bind-attr-*` bindings
              // Map them to the `bindAttr` handler
              var regexAttr = /^bind-attr-.+$/i;
              if (regexAttr.test(bindAttr.name)) {
                fns.bindAttr.call(this, bindEl, bindAttr.name, bindAttr.value);
              }
              break;
          }
        }.bind(this));
      }


      // End bindings
      if (_.isUndefined(options.index) && bindings.length > 0) {
        Woodhouse.log("View: %s, Added %d parent bindings", this.cid, bindings.length);
      }


      // Return all bindings to be released later
      return bindings;
    },


    // Removes all bindings bound with the `bind-*` attribute from current view
    // Should only be called with the view is being cleaned up
    removeBindings: function(bindings) {
      var count = 0,
        isChild = false;

      if (bindings) {
        isChild = true;
      } else {
        bindings = this.bindings || [];
      }

      var binding;
      while (binding = bindings.shift()) {
        if (binding.object && _.isFunction(binding.object.off)) {
          binding.object.off(binding.events, binding.handler);
        }
        count += 1;
      }

      if (count > 0) {
        if (isChild) {
          Woodhouse.log("View: %s, Removed %d child bindings", this.cid, count);
        } else {
          Woodhouse.log("View: %s, Removed %d parent bindings", this.cid, count);
        }
      }
    },

    // TODO
    // NEEDS A TEST
    // This is intended to be called if HTML is injected into the DOM
    // after the initial render of the view. (for ex. using jquery)
    appendBindings: function() {
      var appendedBindings = this.addBindings({
        el: this.$el,
        model: this.model,
        collection: this.collection
      }) || [];
      this.bindings = this.bindings.concat(appendedBindings);
    },


    getBindAttributes: function(node) {
      var attrs = {};
      var regex = /^bind\-(.+)$/;

      if (!node.attributes) {
        return attrs;
      }

      $.each(node.attributes, function(index, attr) {
        if (regex.test(attr.nodeName)) {
          attrs[attr.nodeName] = attr.nodeValue;
        }
      });

      return attrs;
    },

    // View Handling
    // ---
    //
    // Forward all subview events to super view
    // Inspired by Marionette
    forwardChildViewEvents: function(view) {
      var prefix = "subview";

      this.listenTo(view, "all", function() {
        var args = Array.prototype.slice.call(arguments);
        var event = prefix + ":" + args.shift();

        this.trigger(event, args);
      }, this);

      return this;
    },

    // Render should be able to be called multiple times without side effects.
    // If the view has been rendered before, it will cleanup listeners/bindings and remove subviews recursively
    // Render will add listeners/bindings
    render: function(options) {
      Woodhouse.log("Rendering a view", this.cid);

      options = options || {};
      _.defaults(options, {});

      // Flag to determine if the view has been rendered before
      this.isRendered = this.isRendered || false;

      // Cleanup the current view if it has been previous rendered
      if (this.isRendered) {
        // Cleanup subviews, listeners, and bindings
        this.cleanup();
      }

      // This method gets called BEFORE render
      if (_.isFunction(this.onBeforeRender)) {
        this.onBeforeRender();
      }

      // Insert view into the DOM at el
      if (_.isFunction(this.template)) {
        this.$el.html(this.evaluateTemplate(this.template));
      }

      if (options.animate) {
        this.$el.hide()
          .show("fast");
      } else {
        this.$el.show();
      }

      // Add any model <-> view bindings
      this.bindings = this.addBindings({
        el: this.$el,
        model: this.model,
        collection: this.collection
      }) || [];

      this.delegateEvents.call(this);

      // Set view as rendered
      this.isRendered = true;

      // This method gets called AFTER render
      // This is a good place to add subviews
      if (_.isFunction(this.onRender)) {
        this.onRender();
      }

      return this;
    },

    cleanup: function() {
      // Remove subviews
      this.removeSubviews();

      // Remove any model <-> view bindings
      this.removeBindings();
      if (this.childBindings) {
        this.removeBindings(this.childBindings);
      }

      this.undelegateEvents.call(this);

      // Stop listening to any listenTo events
      this.stopListening();
    },

    // Remove will cleanup any listeners/bindings and remove subviews recursively
    remove: function(options) {
      Woodhouse.log("Removing a view", this.cid);

      options = options || {};
      _.defaults(options, {});

      // This method gets called BEFORE remove
      if (_.isFunction(this.onBeforeRemove)) {
        this.onBeforeRemove();
      }

      // Cleanup subviews, listeners, and bindings
      this.cleanup();

      // Remove current view el from the DOM
      var duration = 0;
      if (options.animate) {
        duration = "fast";
      }
      this.$el.hide(duration, function() {
        this.$el.remove();
      }.bind(this));

      // Set view as NOT rendered
      this.isRendered = false;

      // This method gets called AFTER remove
      if (_.isFunction(this.onRemove)) {
        this.onRemove();
      }

      return this;
    },

    // Adds a subview to the current view
    // Removed when parentView.removeSubviews is called
    // Removed when parentView.removeSubview is called
    addSubview: function(view, options) {
      if (!view) {
        return view;
      }

      options = options || {};
      _.defaults(options, {
        render: true
      });

      // Add view to parent's subviews
      this.subviews = this.subviews || [];
      this.subviews.push(view);

      // Set the view's superview
      view.superview = this;

      // Set the view's el if provided
      if (options.el) {
        if (options.append) {
          $(options.el)
            .append(view.el);
        } else {
          view.setElement.call(view, options.el);
        }
      }

      // Render new subview
      if (options.render) {
        view.render.call(view, options);
      }

      // Foward child view events to parent
      this.forwardChildViewEvents(view);

      return view;
    },

    // Removes a view from it's superview
    removeFromSuperview: function() {
      if (this.superview) {
        var index = _.indexOf(this.superview.subviews, this);
        this.superview.subviews.splice(index, 1);
      }

      return this;
    },

    removeSubview: function(view) {
      view.removeFromSuperview();
      view.remove();

      return this;
    },

    // Removes any subviews associated with this view which will in-turn remove any subviews of those views
    removeSubviews: function() {
      if (this.subviews) {
        _.invoke(this.subviews, 'remove');
        this.subviews = [];
      }

      return this;
    },

    // Cross browser implementation of preventDefault
    preventDefault: function(e) {
      if (e) {
        // prevent default action
        if (typeof e.preventDefault === "function") {
          e.preventDefault();
        }
        e.returnValue = false;
      }
    },

    // Cross browser implementation of stopPropagation
    stopPropagation: function(e) {
      if (e) {
        // no bubble
        if (typeof e.stopPropagation === "function") {
          e.stopPropagation();
        }
        e.cancelBubble = true;
      }
    },

    // Cross browser implementation of preventDefault and stopPropagation
    preventDefaultStopPropagation: function(e) {
      this.preventDefault(e);
      this.stopPropagation(e);
    },


    // Marionette.bindEntityEvents & unbindEntityEvents
    // ---
    //
    // These methods are used to bind/unbind a backbone "entity" (collection/model)
    // to methods on a target object.
    //
    // The first parameter, `target`, must have a `listenTo` method from the
    // EventBinder object.
    //
    // The second parameter is the entity (Backbone.Model or Backbone.Collection)
    // to bind the events from.
    //
    // The third parameter is a hash of { "event:name": "eventHandler" }
    // configuration. Multiple handlers can be separated by a space. A
    // function can be supplied instead of a string handler name.

    // Bind the event to handlers specified as a string of
    // handler names on the target object
    _bindFromStrings: function(target, entity, evt, methods) {
      var methodNames = methods.split(/\s+/);

      _.each(methodNames, function(methodName) {

        var method = target[methodName];
        if (!method) {
          Woodhouse.throwError("Method '" + methodName + "' was configured as an event handler, but does not exist.");
        }

        target.listenTo(entity, evt, method, target);
      });
    },

    // Bind the event to a supplied callback function
    _bindToFunction: function(target, entity, evt, method) {
      target.listenTo(entity, evt, method, target);
    },

    // Bind the event to handlers specified as a string of
    // handler names on the target object
    _unbindFromStrings: function(target, entity, evt, methods) {
      var methodNames = methods.split(/\s+/);

      _.each(methodNames, function(methodName) {
        var method = target[methodName];
        target.stopListening(entity, evt, method, target);
      });
    },

    // Bind the event to a supplied callback function
    _unbindToFunction: function(target, entity, evt, method) {
      target.stopListening(entity, evt, method, target);
    },


    // Loop all bindings
    _iterateEvents: function(target, entity, bindings, functionCallback, stringCallback) {
      if (!entity || !bindings) {
        return;
      }

      // allow the bindings to be a function
      if (_.isFunction(bindings)) {
        bindings = bindings.call(target);
      }

      // iterate the bindings and bind them
      _.each(bindings, function(methods, evt) {
        // allow for a function as the handler,
        // or a list of event names as a string
        if (_.isFunction(methods)) {
          functionCallback(target, entity, evt, methods);
        } else {
          stringCallback(target, entity, evt, methods);
        }
      });
    },

    bindEntityEvents: function(target, entity, bindings) {
      this._iterateEvents(target, entity, bindings, this._bindToFunction, this._bindFromStrings);
    },

    unbindEntityEvents: function(target, entity, bindings) {
      this._iterateEvents(target, entity, bindings, this._unbindToFunction, this._unbindFromStrings);
    },

    // Extending to handle custom event observers
    delegateEvents: function(events) {
      Backbone.View.prototype.delegateEvents.apply(this, arguments);

      this.unbindEntityEvents(this, this.model, this.modelEvents);
      this.unbindEntityEvents(this, this.collection, this.collectionEvents);
      this.bindEntityEvents(this, this.model, this.modelEvents);
      this.bindEntityEvents(this, this.collection, this.collectionEvents);
    },

    undelegateEvents: function() {
      Backbone.View.prototype.undelegateEvents.apply(this, arguments);

      this.unbindEntityEvents(this, this.model, this.modelEvents);
      this.unbindEntityEvents(this, this.collection, this.collectionEvents);
    }
  });


  // Collection View
  // ---
  //
  // Mostly inspired by Marionette
  Woodhouse.CollectionView = Woodhouse.View.extend({
    render: function() {
      Woodhouse.View.prototype.render.apply(this, arguments);

      this.renderList();

      return this;
    },

    // TODO optimize with document fragments
    renderList: function() {
      this.collection.each(function(model) {
        var itemView = new this.ItemView({
          model: model
        });
        this.addSubview(itemView);
        $(this.listEl)
          .append(itemView.el);
      }, this);

      return this;
    }
  });

  return Woodhouse;
}));
