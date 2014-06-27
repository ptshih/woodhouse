'use strict';

module('Bindings', {
  setup: function() {
    // Elements
    // TODO (kelly) break these tests up into logical chunks
    var $fixture = $('#qunit-fixture');
    this.$input = $('<input id="input" bind-val="text" />');
    this.$textarea = $('<textarea id="textarea" bind-val="html"></textarea>');
    this.$contenteditable = $('<div id="contenteditable" contenteditable="true" bind-text="text"></div>');
    this.$text = $('<div id="text" bind-text="text"></div>');
    this.$html = $('<div id="html" bind-text="html"></div>');
    this.$uppercase = $('<div id="uppercase" bind-text="uppercase"></div>');

    this.$visible = $('<div id="visible" bind-visible="shouldBeVisible"></div>');
    this.$hidden = $('<div id="hidden" bind-hidden="shouldBeHidden"></div>');

    this.$enabled = $('<input id="enabled" type="text" bind-enabled="shouldBeEnabled" />');
    this.$disabled = $('<input id="disabled" type="text" bind-disabled="shouldBeDisabled" />');

    this.$if = $('<div id="if" bind-if="shouldBeTrue"><div>True</div></div>');
    this.$unless = $('<div id="unless" bind-unless="shouldBeFalse"><div>False</div></div>');

    this.$checked = $('<input id="checked" type="checkbox" bind-checked="checked" />');

    this.$array = $('<div id="array"><div bind-array="array"></div></div>');
    this.$attr = $('<div id="attr" bind-attr-data-attr="attr"></div>');

    this.$each = $('<div id="each" bind-each="each"><div class="each-item" bind-text="id" bind-attr-data-id="id"></div></div>');
    this.$select = $('<select id="select" bind-each="select" bind-val="selected_id"><option bind-val="id" bind-text="text"></option></select>');

    $.each([
      'input',
      'textarea',
      'contenteditable',
      'text',
      'html',
      'uppercase',
      'visible',
      'hidden',
      'enabled',
      'disabled',
      'if',
      'unless',
      'checked',
      'array',
      'attr',
      'each',
      'select'
    ], function(i, name) {
      $fixture.append(this['$' + name]);
    }.bind(this));

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
  },
  teardown: function() {}
});


test('default binding values', function() {
  equal(this.$text.text(), 'Sterling Archer');
  equal(this.$html.html(), '&lt;strong&gt;ISIS&lt;/strong&gt;');
  equal(this.$uppercase.text(), 'STERLING ARCHER');

  equal(this.$input.val(), 'Sterling Archer');
  equal(this.$textarea.val(), '<strong>ISIS</strong>');

  ok(this.$visible.is(':visible'));
  ok(this.$hidden.is(':hidden'));
  ok(this.$enabled.is(':enabled'));
  ok(this.$disabled.is(':disabled'));
  ok(this.$checked.prop('checked'));
});


test('bind-text', function() {
  expect(3);

  // default
  equal(this.$text.text(), 'Sterling Archer');

  // model-to-view
  this.model.set('text', 'Malory Archer');
  equal(this.$text.text(), 'Malory Archer');

  // view-to-model
  this.$input.val('Woodhouse');
  this.$input.trigger('input');
  equal(this.model.get('text'), 'Woodhouse');
});


test('bind-html', function() {
  expect(3);

  // default
  equal(this.$html.html(), '&lt;strong&gt;ISIS&lt;/strong&gt;');

  // model-to-view
  this.model.set('html', '<strong>ODIN</strong>');
  equal(this.$html.html(), '&lt;strong&gt;ODIN&lt;/strong&gt;');

  // view-to-model
  this.$textarea.val('<strong>ISIS</strong>');
  this.$textarea.trigger('input');
  equal(this.$html.html(), '&lt;strong&gt;ISIS&lt;/strong&gt;');
});


test('bind-text with computed function', function() {
  expect(1);

  equal(this.$uppercase.text(), 'STERLING ARCHER');
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
