'use strict';


// Computed properties
// ---
module('Models with computed property');

test('setting a child model as an attribute of a parent model', function() {
  var A = Woodhouse.Model.extend({
    defaults: function() {
      return {
        message: '',
        troll: function() {
          return this.get('message').toUpperCase();
        }.property('message')
      };
    }
  });

  var a = new A();

  equal(a.get('message'), '');

  a.set({
    message: 'welcome to the danger zone'
  });

  ok(!_.isFunction(a.get('troll')), 'auto eval on get');
  ok(_.isFunction(a.attributes.troll), 'raw computed property function');

  equal(a.get('message'), 'welcome to the danger zone');
  equal(a.get('troll'), 'WELCOME TO THE DANGER ZONE');
});



// Additional tests
// ---
module('Additional tests');

test('setting a child model as an attribute of a parent model', function() {
  var A = Woodhouse.Model.extend({
    relations: [{
      type: 'model',
      key: 'agent',
      model: Woodhouse.Model,
      collection: Woodhouse.Collection
    }],

    defaults: function() {
      return {
        agent: {}
      };
    }
  });

  var a = new A();
  var b = new Woodhouse.Model();

  a.set({
    name: 'International Secret Intelligence Service',
    acronym: 'ISIS'
  });
  b.set({
    name: 'Sterling Archer',
    codename: 'Duchess'
  });
  a.set('agent', b);

  ok(a.get('agent') instanceof Woodhouse.Model);
  ok(b instanceof Woodhouse.Model);

  deepEqual(a.toJSON(), {
    'acronym': 'ISIS',
    'agent': {
      'codename': 'Duchess',
      'name': 'Sterling Archer'
    },
    'name': 'International Secret Intelligence Service'
  });
});

test('setting 2 levels of nested models as an attribute of a parent model', function() {
  var B = Woodhouse.Model.extend({
    relations: [{
      type: 'collection',
      key: 'agents',
      model: Woodhouse.Model,
      collection: Woodhouse.Collection
    }],

    defaults: function() {
      return {
        agents: []
      };
    }
  });
  var A = Woodhouse.Model.extend({
    relations: [{
      type: 'model',
      key: 'directory',
      model: B,
      collection: Woodhouse.Collection
    }],

    defaults: function() {
      return {
        directory: {}
      };
    }
  });

  var a = new A();
  var b = new B();

  a.set({
    name: 'International Secret Intelligence Service',
    acronym: 'ISIS'
  });
  b.set({
    name: 'ISIS Employee Directory',
    agents: [{
      id: 1,
      name: 'Sterling Archer',
      role: 'Duchess'
    }, {
      id: 2,
      name: 'Lana Kang',
      role: 'Spy'
    }]
  });
  a.set('directory', b);

  ok(b.get('agents') instanceof Woodhouse.Collection);
  ok(a.get('directory') instanceof B);
  ok(a.get('directory.agents') instanceof Woodhouse.Collection);

  // a has a different model that gets set with data from b
  notEqual(a.get('directory').cid, b.cid);

  deepEqual(a.toJSON(), {
    'acronym': 'ISIS',
    'directory': {
      'agents': [{
        'id': 1,
        'name': 'Sterling Archer',
        'role': 'Duchess'
      }, {
        'id': 2,
        'name': 'Lana Kang',
        'role': 'Spy'
      }],
      'name': 'ISIS Employee Directory'
    },
    'name': 'International Secret Intelligence Service'
  });


  a.set({
    directory: {
      agents: [{
        'id': 1,
        'name': 'Sterling Archer',
        'role': 'Duchess'
      }]
    }
  });

  ok(a.get('directory.agents') instanceof Woodhouse.Collection);
  equal(a.get('directory.agents.length'), 1);

});

test('unset a property of a nested object', function() {
  var a = new Woodhouse.Model({
    shipping_address: {
      city: 'Los Santos',
      zip: '90210'
    }
  });

  a.unset('shipping_address.zip');

  deepEqual(a.toJSON(), {
    shipping_address: {
      city: 'Los Santos'
    }
  });
});


test('unsetting a string property of a child model as an attribute of a parent model', function() {
  var A = Woodhouse.Model.extend({
    relations: [{
      type: 'model',
      key: 'agent',
      model: Woodhouse.Model,
      collection: Woodhouse.Collection
    }],

    defaults: function() {
      return {
        agent: {}
      };
    }
  });

  var a = new A();
  var b = new Woodhouse.Model();

  a.set({
    name: 'International Secret Intelligence Service',
    acronym: 'ISIS'
  });
  b.set({
    name: 'Sterling Archer',
    codename: 'Duchess'
  });
  a.set('agent', b);
  a.unset('agent.codename');

  ok(a.get('agent') instanceof Woodhouse.Model);
  ok(b instanceof Woodhouse.Model);

  deepEqual(a.toJSON(), {
    'acronym': 'ISIS',
    'agent': {
      'name': 'Sterling Archer'
    },
    'name': 'International Secret Intelligence Service'
  });
});

test('setting an array property of a child collection as an attribute of a parent model', function() {
  var A = Woodhouse.Model.extend({
    relations: [{
      type: 'collection',
      key: 'agents',
      model: Woodhouse.Model,
      collection: Woodhouse.Collection
    }],

    defaults: function() {
      return {
        agents: []
      };
    }
  });

  var a = new A();
  var b = new Woodhouse.Collection();

  a.set({
    name: 'International Secret Intelligence Service',
    acronym: 'ISIS'
  });
  b.add({
    name: 'Sterling Archer',
    codename: 'Duchess'
  });
  a.set('agents', b);

  ok(a.get('agents') instanceof Woodhouse.Collection);
  ok(b instanceof Woodhouse.Collection);

  deepEqual(a.toJSON(), {
    'acronym': 'ISIS',
    'agents': [{
      name: 'Sterling Archer',
      codename: 'Duchess'
    }],
    'name': 'International Secret Intelligence Service'
  });
});

test('unsetting an array property of a child collection as an attribute of a parent model', function() {
  var A = Woodhouse.Model.extend({
    relations: [{
      type: 'collection',
      key: 'agents',
      model: Woodhouse.Model,
      collection: Woodhouse.Collection
    }],

    defaults: function() {
      return {
        agents: []
      };
    }
  });

  var a = new A();
  var b = new Woodhouse.Collection();

  a.set({
    name: 'International Secret Intelligence Service',
    acronym: 'ISIS'
  });
  b.add({
    name: 'Sterling Archer',
    codename: 'Duchess'
  });
  a.set('agents', b);
  a.unset('agents.0');

  ok(a.get('agents') instanceof Woodhouse.Collection);
  ok(b instanceof Woodhouse.Collection);

  deepEqual(a.toJSON(), {
    'acronym': 'ISIS',
    'agents': [],
    'name': 'International Secret Intelligence Service'
  });
});
