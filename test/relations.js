/* global module, test, start, stop, ok, equal, notEqual, deepEqual */
(function() {
  'use strict';


  // Models with relations
  // ---
  module('Models with relations', {
    setup: function() {
      var Servant = Woodhouse.Model.extend({});
      var Grandchild = Woodhouse.Model.extend({});
      var Grandchildren = Woodhouse.Collection.extend({});
      var Child = Woodhouse.Model.extend({
        relations: [{
          type: 'model',
          key: 'grandchild',
          model: Grandchild
        }, {
          type: 'collection',
          key: 'grandchildren',
          model: Grandchild,
          collection: Grandchildren
        }]
      });
      var Parent = Woodhouse.Model.extend({
        relations: [{
          type: 'model',
          key: 'child',
          model: Child
        }, {
          type: 'model',
          key: 'servant',
          model: Servant
        }]
      });

      this.emptyModel = new Parent({});
      this.model = new Parent({
        name: 'parent',
        child: {
          name: 'child',
          grandchild: {
            name: 'grandchild'
          },
          grandchildren: [{
            name: 'grandson',
            age: 5
          }]
        },
        servant: {}
      });
    }
  });

  test('get attribute value', function() {
    deepEqual(this.model.get('name'), 'parent');
    deepEqual(this.model.get('servant').attributes, {});
    deepEqual(this.model.get('child.name'), 'child');
    deepEqual(this.model.get('child.grandchild').attributes, {
      name: 'grandchild'
    });
    deepEqual(this.model.get('child.grandchild.name'), 'grandchild');
    deepEqual(this.model.get('child.grandchildren').toJSON(), [{
      name: 'grandson',
      age: 5
    }]);
    deepEqual(this.model.get('child.grandchildren').at(0).attributes, {
      name: 'grandson',
      age: 5
    });
    deepEqual(this.model.get('child.grandchildren.0').attributes, {
      name: 'grandson',
      age: 5
    });
    deepEqual(this.model.get('child.grandchildren.0.name'), 'grandson');
    deepEqual(this.model.get('child.grandchildren.0.age'), 5);

  });

  test('set attribute value (empty)', function() {
    this.emptyModel.set('name', 'malory');
    deepEqual(this.emptyModel.changed, {
      name: 'malory'
    });
    deepEqual(this.emptyModel.get('name'), 'malory');

    this.emptyModel.set('name', {
      first_name: 'malory',
      last_name: 'archer'
    });
    deepEqual(this.emptyModel.changed, {
      name: {
        first_name: 'malory',
        last_name: 'archer'
      }
    });
    deepEqual(this.emptyModel.get('name'), {
      first_name: 'malory',
      last_name: 'archer'
    });

    this.emptyModel.set('child.name', 'sterling');
    deepEqual(this.emptyModel.changed, {
      child: {
        name: 'sterling'
      }
    });
    deepEqual(this.emptyModel.get('child.name'), 'sterling');

    this.emptyModel.set('child.grandchild.name', 'seamus');
    deepEqual(this.emptyModel.changed, {
      child: {
        grandchild: {
          name: 'seamus'
        }
      }
    });
    deepEqual(this.emptyModel.get('child.grandchild.name'), 'seamus');

    this.emptyModel.set('child.grandchild', {
      name: 'baby seamus'
    });
    deepEqual(this.emptyModel.changed, {
      child: {
        grandchild: {
          name: 'baby seamus'
        }
      }
    });
    deepEqual(this.emptyModel.get('child.grandchild.name'), 'baby seamus');

    this.emptyModel.set('servant', {
      name: 'woodhouse'
    });
    deepEqual(this.emptyModel.changed, {
      servant: {
        name: 'woodhouse'
      }
    });
    deepEqual(this.emptyModel.get('servant.name'), 'woodhouse');

    this.emptyModel.set('child.grandchildren', [{
      name: 'dicky'
    }, {
      name: 'seamus'
    }]);
    deepEqual(this.emptyModel.changed, {
      child: {
        grandchildren: [{
          name: 'dicky'
        }, {
          name: 'seamus'
        }]
      }
    });
    deepEqual(this.emptyModel.get('child.grandchildren').toJSON(), [{
      name: 'dicky'
    }, {
      name: 'seamus'
    }]);

    this.emptyModel.set('child.grandchildren.1.name', 'baby seamus');
    deepEqual(this.emptyModel.changed, {
      child: {
        grandchildren: {
          '1': {
            name: 'baby seamus'
          }
        }
      }
    });
    deepEqual(this.emptyModel.get('child.grandchildren.1.name'), 'baby seamus');

    this.emptyModel.set('child.grandchildren.1', {
      name: 'infant seamus'
    });
    deepEqual(this.emptyModel.get('child.grandchildren.1.name'), 'infant seamus');

    this.emptyModel.set('child.grandchildren.1', {
      age: 0
    });
    deepEqual(this.emptyModel.get('child.grandchildren.1.age'), 0);
    deepEqual(this.emptyModel.get('child.grandchildren.1').attributes, {
      age: 0,
      name: 'infant seamus'
    });

    // NOT ALLOWED
    // this.emptyModel.set('child.grandchildren', {
    //   '1': {
    //     name: 'little seamus'
    //   }
    // });
    // deepEqual(this.emptyModel.get('child.grandchildren.1.name'), 'little seamus');
  });

  test('set attribute that is not a relation but is a model', function() {
    var randomBackboneModel = new Backbone.Model();
    this.emptyModel.set('friend', randomBackboneModel);
    deepEqual(this.emptyModel.get('friend'), randomBackboneModel);
  });


})();