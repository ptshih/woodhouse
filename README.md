### About Woodhouse

Woodhouse is a small library that sits on top of Backbone.js that adds basic view and subview management as well as template defined Model-View bindings.

It is a collection of some of my favorite design and implementation patterns that I have worked with across many  ai frontend Javascript frameworks including Backbone.js, Angular.js, Knockout.js, and Ember.js. There is also a slight influence from Cocoa Touch due to my previous background with iOS development.

### What features does Woodhouse have?

- Computed properties (inspired by Ember.js).
- Object relationship management (deep models).
- View and Subview rendering and management boilerplate (inspired by Marionette.js).
- Model-View bindings marked up in templates (inspired by Knockout.js).
- Fully compatible with `Backbone.js 1.1.2`.

### What does Woodhouse not do?

- Not a replacement for Backbone.js (it depends on Backbone.js and jQuery).
- Does not give you wings.

### Why should I use Woodhouse?

Woodhouse is not for everyone. It worked really well for our team and what we wanted to accomplish so we just wanted to share it with anyone would could benefit from our learnings.

#### Why should I use Woodhouse instead of another framework like Angular.js?

If you want to use a template driven Model-View binding system such as the ones used by Knockout.js and Angular.js while still taking advantage of Backbone's Model, Collection, and View framework, Woodhouse is perfect for you.

#### Why did you build Woodhouse?

While developing [Celery's](https://trycelery.com) new dashboard, we first started out as using a pure Backbone.js implementation. We quickly realized we were writing lots of boilerplate View rendering code, so we experimented with Marionette.js to see if that could help. Although that did help with alleviating the woes of dealing with subviews, we stll had to re-render the entire view anytime our Models changed.

Having worked with other frontend frameworks with first-party bindings, I quickly missed having intelligent Model-View bindings that I could markup in the templates.

The bindings used in Woodhouse are heavily inspired by Knockout.js both syntactically and principle.