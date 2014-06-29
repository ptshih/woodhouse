'use strict';

// Models without relations
// ---
module('Events', {
  setup: function() {},
  teardown: function() {}
});

test("events trigger set with dot notation", function() {
  expect(1);

  var model = new Woodhouse.Model({
    shipping_address: {
      city: 'Los Santos',
      zip: '90210'
    }
  });

  model.on('change:shipping_address.state', function() {
    equal(model.get('shipping_address.state'), 'NY');
  }.bind(this));

  model.set('shipping_address.state', 'NY');
});

test("events trigger set with nested object", function() {
  expect(2);

  var model = new Woodhouse.Model({
    shipping_address: {
      city: 'Los Santos',
      zip: '90210'
    }
  });

  model.on('change:shipping_address.state', function() {
    equal(model.get('shipping_address.state'), 'NJ');
    equal(model.get('shipping_address.zone.hot'), 'yes');
  }.bind(this));

  model.set('shipping_address', {
    state: 'NJ',
    zone: {
      hot: 'yes'
    }
  });
});

test("events trigger set array", function() {
  expect(1);

  var model = new Woodhouse.Model({
    siblings: ['bob', 'linda']
  });

  model.on('change:siblings', function() {
    equal(model.get('siblings').length, 3);
  }.bind(this));

  model.set('siblings', ['tina', 'gene', 'louise']);
});

test("events trigger only once", function() {
  var model = new Woodhouse.Model();

  var events = [];
  model.on('all', function(event) {
    events.push(event);
  }.bind(this));

  model.set({
    id: 1,
    name: {
      first_name: 'sterling',
      last_name: 'archer'
    }
  });

  deepEqual(events, [
    "change:id",
    "change:name",
    "change:name.first_name",
    "change:name.*",
    "change:name.last_name",
    "change"
  ]);
});
