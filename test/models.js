'use strict';

// Models without relations
// ---
module('Models without relations', {
  setup: function() {},
  teardown: function() {}
});

test('get attribute value', function() {
  var model = new Woodhouse.Model({
    name: 'parent',

    child: {
      name: 'child',
      grandchild: {
        name: 'grandchild',
        greatgrandchild: {
          name: 'greatgrandchild'
        }
      },
      siblings: ['tina', 'gene', 'louise']
    },

    array: [1, 2, 3],

    emptyObject: {},
    emptyArray: [],

    siblings: [{
      name: 'john',
      tags: ['cool', 'sweet']
    }, {
      name: 'joe',
      tags: ['omg', 'wtf']
    }]
  });

  deepEqual(model.get('name'), 'parent');
  deepEqual(model.get('child.name'), 'child');
  deepEqual(model.get('child.siblings'), ['tina', 'gene', 'louise']);
  deepEqual(model.get('child.grandchild.name'), 'grandchild');
  deepEqual(model.get('child.grandchild.greatgrandchild.name'), 'greatgrandchild');

  deepEqual(model.get('siblings'), [{
    name: 'john',
    tags: ['cool', 'sweet']
  }, {
    name: 'joe',
    tags: ['omg', 'wtf']
  }]);
  deepEqual(model.get('siblings.0.name'), 'john');
  deepEqual(model.get('siblings.1.name'), 'joe');
  deepEqual(model.get('siblings.0.tags'), ['cool', 'sweet']);


  deepEqual(model.get('emptyObject'), {}, 'empty object');
  deepEqual(model.get('emptyArray'), [], 'empty array');
});


test('set attribute value (objects)', function() {
  var model = new Woodhouse.Model({
    name: 'parent',

    child: {
      name: 'child',
      grandchild: {
        name: 'grandchild',
        greatgrandchild: {
          name: 'greatgrandchild'
        }
      },
      siblings: ['tina', 'gene', 'louise']
    }
  });

  // set an attribute
  model.set('name', 'malory');
  deepEqual(model.get('name'), 'malory');

  // set an attribute that doesn't exist
  model.set('gender', 'female');
  deepEqual(model.get('gender'), 'female');

  // set an attribute that already exists (overwrite)
  model.set('child', {
    name: 'sterling'
  });
  deepEqual(model.get('child'), {
    name: 'sterling'
  });

  // set an attribute of a nested object that doesn't exist
  model.set('child.grandchild.name', 'seamus');
  deepEqual(model.get('child.grandchild'), {
    name: 'seamus'
  });

  // set an attribute of a nested object that exists
  model.set('child.grandchild.age', 1);
  deepEqual(model.get('child.grandchild.age'), 1);
  deepEqual(model.get('child.grandchild'), {
    name: 'seamus',
    age: 1
  });

});


test('set attribute value (arrays)', function() {
  var model = new Woodhouse.Model({
    agencies: ['isis', 'odin'],

    agents: [{
      name: 'archer'
    }, {
      name: 'lana'
    }]
  });

  // array of strings
  deepEqual(model.get('agencies'), ['isis', 'odin']);
  model.set('agencies', ['cia', 'fbi', 'nsa']);
  deepEqual(model.get('agencies'), ['cia', 'fbi', 'nsa']);

  // array of objects
  deepEqual(model.get('agents'), [{
    name: 'archer'
  }, {
    name: 'lana'
  }]);
  model.set('agents', [{
    name: 'cyril'
  }, {
    name: 'ray'
  }]);
  deepEqual(model.get('agents'), [{
    name: 'cyril'
  }, {
    name: 'ray'
  }]);

  // set array index string
  model.set('agents.0.name', 'woodhouse');
  deepEqual(model.get('agents'), [{
    name: 'woodhouse'
  }, {
    name: 'ray'
  }]);

  // set array index object
  model.set('agents.1', {
    name: 'krieger'
  });
  deepEqual(model.get('agents'), [{
    name: 'woodhouse'
  }, {
    name: 'krieger'
  }]);

});



test('more setter tests (objects)', function() {
  var model = new Woodhouse.Model({
    shipping_address: {
      city: 'Los Santos',
      zip: '90210'
    }
  });

  // replace an attribute
  model.set('shipping_address', {
    street: '123 broadway',
    country: 'us'
  });

  deepEqual(model.attributes, {
    shipping_address: {
      street: '123 broadway',
      country: 'us'
    }
  });

  model.set('shipping_address.zones', {
    start: '1000',
    end: '2000'
  });

  deepEqual(model.attributes, {
    shipping_address: {
      street: '123 broadway',
      country: 'us',
      zones: {
        start: '1000',
        end: '2000'
      }
    }
  });

  model.set('shipping_address.zones.end', '3000');
  deepEqual(model.get('shipping_address.zones.end'), '3000');

  deepEqual(model.attributes, {
    shipping_address: {
      street: '123 broadway',
      country: 'us',
      zones: {
        start: '1000',
        end: '3000'
      }
    }
  });

});

test('more setter tests (objects)', function() {
  var model = new Woodhouse.Model({
    child: {
      name: 'child',
      grandchild: {
        name: 'grandchild'
      }
    }
  });

  model.set('child.grandchild.asdf', 'lol');

  deepEqual(model.attributes, {
    child: {
      name: 'child',
      grandchild: {
        name: 'grandchild',
        asdf: 'lol'
      }
    }
  });

  model.set('child.grandchild', {
    asdf: 'lol'
  });

  deepEqual(model.attributes, {
    child: {
      name: 'child',
      grandchild: {
        asdf: 'lol'
      }
    }
  });
});