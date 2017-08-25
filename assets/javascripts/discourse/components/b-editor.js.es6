import { default as computed, observes } from 'ember-addons/ember-computed-decorators';
import { cookAsync } from 'discourse/lib/text';
import BEditor from '../../b-editor/index';

export default Ember.Component.extend({
  classNames: ['b-editor'],

  @computed('placeholder')
  placeholderTranslated(placeholder) {
    if (placeholder) return I18n.t(placeholder);
    return null;
  },

  didInsertElement() {
    this._super();
    this.handleValueChange();

    if (this.get('composerEvents')) {
      this.appEvents.on('composer:insert-block', text => {
        cookAsync(text, this.get('markdownOptions') || {})
          .then(cooked => {
            const html = cooked.toString();

            if (html === '') {
              return;
            }

            const quote = this.getQuote($(html).get(0));
            this.triggerEditorEvent('quoteadd', quote);
          });
      });
    }
  },

  editorSubscribe(editorEventHandler) {
    this._editorEventHandler = editorEventHandler;
  },

  triggerEditorEvent() {
    if (!this._editorEventHandler) {
      return;
    }

    return this._editorEventHandler.apply(null, arguments);
  },

  normalizeParagraph(el) {
    const $el = $(el);
    const $prevEl = $el.prev();

    // Convert p into 2 lines
    if ($prevEl.prop('tagName') === 'P') {
      $prevEl.html(`${$prevEl.html()}<br /><br />${$el.html()}`);
      $el.remove();
    }
  },

  getQuote(asideEl) {
    const $asideEl = $(asideEl);
    $asideEl.find('p').each((_, el) => this.normalizeParagraph(el));

    return {
      avatarURL: $asideEl.find('.title img').attr('src'),
      username: $asideEl.find('.title').text().trim().slice(0, -1),
      postId: parseInt($asideEl.data('post'), 10),
      topicId: parseInt($asideEl.data('topic'), 10),
      innerHTML: $asideEl.find('blockquote').html().trim()
    };
  },

  getProps({ cooked }) {
    const $container = $('<div>').append($(cooked.toString()));
    const quotes = [];

    // Convert p into 2 lines
    $container.find('p').each((_, el) => this.normalizeParagraph(el));

    // Make internal links have hosts
    $container.find('a').each((_, el) => {
      el.href = el.href;
    });

    $container.find('aside').each((index, asideEl) => {
      const quote = this.getQuote(asideEl);

      quotes[index] = quote;
      $(asideEl).replaceWith($(`<blockquote>${quote.innerHTML}</blockquote>`));
    });

    return {
      placeholder: this.get('placeholderTranslated'),
      html: $container.html(),
      subscribe: this.editorSubscribe.bind(this),
      onValueChange: this.receiveValue.bind(this),
      quotes
    };

    return $container.html();
  },

  renderBEditor({ cooked }) {
    ReactDOM.render(
      React.createElement(
        BEditor,
        this.getProps({ cooked })
      ),
      this.$().get(0)
    );
  },

  receiveValue(nextValue) {
    this._receivedValue = nextValue;
    this.set('value', nextValue);
  },

  @observes('value')
  handleValueChange() {
    const value = this.get('value');
    const markdownOptions = this.get('markdownOptions') || {};
    const shouldComponentUpdate = value !== this._receivedValue;

    cookAsync(value, markdownOptions)
      .then(cooked => {
        this.set('cooked', cooked);

        if (shouldComponentUpdate) {
          this.renderBEditor({ cooked });
        }
      });
  }
});
