import { withPluginApi } from 'discourse/lib/plugin-api';
import { h } from 'virtual-dom';

const withApi = api => {
  api.modifyClass('model:composer', {
    open() {
      this._super.apply(this, arguments);
      this.set('cooked', '');
    },

    getCookedHtml() {
      return this.get('cooked').toString();
    }
  });
};

export default {
  name: 'wysiwyg',
  initialize() {
    withPluginApi('0.8.9', withApi);
  }
};