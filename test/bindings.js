'use strict';

module('Bindings', {
  setup: function() {
    Backbone.$ = $;

    this.model = new Woodhouse.Model({
      text: 'Sterling Archer',
      html: '<strong>ISIS</strong>',
      shouldBeTrue: true,
      shouldBeFalse: false,
      shouldBeVisible: true,
      shouldBeHidden: true,
      shouldBeEnabled: true,
      shouldBeDisabled: true,
      checked: true,
      array: [1, 2, 3, 4, 5],
      attr: 'attr',
      each: new Woodhouse.Collection([{
        id: 1
      }, {
        id: 2
      }]),
      select: new Woodhouse.Collection([{
        id: 1,
        text: 'one'
      }, {
        id: 2,
        text: 'two'
      }]),

      uppercase: function() {
        return this.get('text').toUpperCase();
      }.property('text')
    });

    this.view = new Woodhouse.View({
      el: '#qunit-fixture',
      model: this.model
    });

    // Add any model <-> view bindings
    var bindings = this.view.addBindings({
      el: this.view.el,
      model: this.model
    }) || [];


    // Elements
    this.$el = this.view.$el;
    this.$input = this.view.$el.find('#input');
    this.$textarea = this.view.$el.find('#textarea');
    this.$contenteditable = this.view.$el.find('#contenteditable');
    this.$text = this.view.$el.find('#text');
    this.$html = this.view.$el.find('#html');
    this.$uppercase = this.view.$el.find('#uppercase');

    this.$visible = this.view.$el.find('#visible');
    this.$hidden = this.view.$el.find('#hidden');

    this.$enabled = this.view.$el.find('#enabled');
    this.$disabled = this.view.$el.find('#disabled');

    this.$if = this.view.$el.find('#if');
    this.$unless = this.view.$el.find('#unless');

    this.$checked = this.view.$el.find('#checked');

    this.$array = this.view.$el.find('#array');
    this.$attr = this.view.$el.find('#attr');

    this.$each = this.view.$el.find('#each');
    this.$select = this.view.$el.find('#select');
  },
  teardown: function() {

  }
});


test('default binding values', function() {
  deepEqual(this.$text.text(), 'Sterling Archer');
  deepEqual(this.$html.html(), '&lt;strong&gt;ISIS&lt;/strong&gt;');
  deepEqual(this.$uppercase.text(), 'STERLING ARCHER');

  deepEqual(this.$input.val(), 'Sterling Archer');
  deepEqual(this.$textarea.val(), '<strong>ISIS</strong>');

  ok(this.$visible.is(':visible'));
  ok(this.$hidden.is(':hidden'));
  ok(this.$enabled.is(':enabled'));
  ok(this.$disabled.is(':disabled'));
  ok(this.$checked.prop('checked'));
});


test('bind-text', function() {
  expect(3);

  // default
  deepEqual(this.$text.text(), 'Sterling Archer');

  // model-to-view
  this.model.set('text', 'Malory Archer');
  deepEqual(this.$text.text(), 'Malory Archer');

  // view-to-model
  this.$input.val('Malory Archer');
  this.$input.trigger('input');
  deepEqual(this.$text.text(), 'Malory Archer');
});


test('bind-html', function() {
  expect(3);

  // default
  deepEqual(this.$html.html(), '&lt;strong&gt;ISIS&lt;/strong&gt;');

  // model-to-view
  this.model.set('html', '<strong>ODIN</strong>');
  deepEqual(this.$html.html(), '&lt;strong&gt;ODIN&lt;/strong&gt;');

  // view-to-model
  this.$textarea.val('<strong>ODIN</strong>');
  this.$textarea.trigger('input');
  deepEqual(this.$html.html(), '&lt;strong&gt;ODIN&lt;/strong&gt;');
});


test('bind-text with computed function', function() {
  expect(1);

  deepEqual(this.$uppercase.text(), 'STERLING ARCHER');
});


test('bind-hidden bind-visible', function() {
  expect(4);

  // default
  ok(this.$visible.is(':visible'));
  ok(this.$hidden.is(':hidden'));

  // model-to-view
  this.model.set('shouldBeVisible', false);
  this.model.set('shouldBeHidden', false);
  ok(!this.$visible.is(':visible'));
  ok(!this.$hidden.is(':hidden'));
});

test('bind-enabled bind-disabled', function() {
  expect(4);

  // default
  ok(this.$enabled.is(':enabled'));
  ok(this.$disabled.is(':disabled'));

  // model-to-view
  this.model.set('shouldBeEnabled', false);
  this.model.set('shouldBeDisabled', false);
  ok(!this.$enabled.is(':enabled'));
  ok(!this.$disabled.is(':disabled'));
});


test('bind-checked', function() {
  expect(3);

  // default
  ok(this.$checked.prop('checked'));

  // model-to-view
  this.model.set('checked', false);
  ok(!this.$checked.prop('checked'));

  // view-to-model
  this.$checked.prop('checked', 'checked');
  ok(this.$checked.prop('checked'));
});


test('bind-if bind-unless', function() {
  expect(4);

  // default
  equal(this.$if.children().length, 1);
  equal(this.$unless.children().length, 1);

  // model-to-view
  this.model.set('shouldBeTrue', false);
  this.model.set('shouldBeFalse', true);
  equal(this.$if.children().length, 0);
  equal(this.$unless.children().length, 0);

});



test('bind-array', function() {
  expect(5);

  // default
  equal(this.$array.children().length, 5);

  // model-to-view
  this.model.set('array', [6, 7, 8]);
  equal(this.$array.children().length, 3);
  this.$array.children().each(function(index) {
    var val = index + 6;
    equal($(this).text(), val);
  });
});


test('bind-attr', function() {
  expect(2);

  // default
  equal(this.$attr.attr('data-attr'), 'attr');

  // model-to-view
  this.model.set('attr', 'new_attr');
  equal(this.$attr.attr('data-attr'), 'new_attr');
});


test('bind-each', function() {
  expect(3);

  // default
  equal(this.$each.find('.each-item').length, 2);
  equal(this.$each.find('.each-item').first().attr('data-id'), 1);
  equal(this.$each.find('.each-item').last().attr('data-id'), 2);

  // TODO make better comparisons
});

test('bind-each with select/option, two ways to select an option', function() {
  expect(3);

  // default
  equal(this.$select.find('option').length, 2);

  // using prop
  this.$select.children().last().prop('selected', 'selected');
  equal(this.$select.val(), '2');

  // using the model
  this.model.set('selected_id', 1);
  equal(this.$select.val(), '1');
});

// test('appendBindings', function() {
//   expect(1);

//   this.$el.append('<span id="new" bind-text="text"></span>');
//   this.view.appendBindings();
//   equal(this.view.$el.find('#new').text(), this.$text.text());

// });
