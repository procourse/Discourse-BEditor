/* global Draft, React */

const {
  EditorState,
  SelectionState,
  RichUtils,
  Modifier
} = Draft;

import StyleButton from '../style-button';
import utils from '../utils';

export function reducer(editorState, { name, payload }) {
  const contentState = editorState.getCurrentContent();
  const selection = editorState.getSelection();
  const startEntityKey = utils.getStartEntityKey(editorState);

  if (name === 'linkupdate') {
    const { url, text } = payload;
    const inlineStyle = editorState.getCurrentInlineStyle();
    const startEntity = utils.getStartEntity(editorState);

    const selectedLinkURL = startEntity && startEntity.type === 'LINK' ? startEntity.data.url : null;

    if (text === '' && selectedLinkURL !== null) {
      return EditorState.push(editorState, contentState.mergeEntityData(startEntityKey, {
        url: url
      }));
    }

    const [nextEntityKey, nextContentState] = (() => {
      if (selectedLinkURL === url) {
        return [startEntityKey, contentState];
      }

      const contentStateWithEntity = contentState.createEntity('LINK', 'MUTABLE', { url });

      return [contentStateWithEntity.getLastCreatedEntityKey(), contentStateWithEntity];
    })();

    const nextEditorState = EditorState.set(editorState, { currentContent: nextContentState });

    if (text === '' && !selection.isCollapsed()) {
      // When selection is collapsed
      return RichUtils.toggleLink(nextEditorState, nextEditorState.getSelection(), nextEntityKey);
    }

    return EditorState.push(editorState, Modifier.replaceText(nextContentState, selection, text === '' ? url : text, inlineStyle, nextEntityKey));
  }

  if (name === 'linkremove') {
    const startBlock = utils.getStartBlock(editorState);

    startBlock.findEntityRanges(char => {
      const entityKey = char.getEntity();
      return entityKey === startEntityKey;
    }, (start, end) => {
      editorState = EditorState.forceSelection(EditorState.push(editorState, Modifier.applyEntity(contentState, SelectionState.createEmpty(startBlock.key).set('anchorOffset', start).set('focusOffset', end), null)), selection);
    });

    return editorState;
  }

  return editorState;
}

const stopPropagation = e => e.stopPropagation();

export class LinkButton extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      modalOpen: false,
      text: null,
      url: null,
      entityKey: null
    };

    this.backdropEl = document.createElement('div');
    this.backdropEl.className = 'modal-backdrop in';

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.openModal = this.openModal.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.handleURLChange = this.handleURLChange.bind(this);
    this.handleTextChange = this.handleTextChange.bind(this);

    this.submit = this.submit.bind(this);
  }

  render() {
    const { editorState } = this.props;
    const entity = utils.getStartEntity(editorState);

    return React.createElement(
      'span',
      null,
      React.createElement(StyleButton, {
        style: 'LINK',
        onClick: this.openModal,
        active: entity && entity.type === 'LINK'
      }),
      this.state.modalOpen && this.renderModal(),
      this.state.modalOpen && React.createElement('div', { className: 'modal-backdrop in', onClick: this.closeModal })
    );
  }

  renderModal() {
    const { url, text } = this.state;

    return React.createElement(
      'div',
      {
        id: 'discourse-modal',
        className: 'BEditor-link-modal modal in',
        onClick: this.closeModal
      },
      React.createElement(
        'div',
        { className: 'modal-outer-container' },
        React.createElement(
          'div',
          { className: 'modal-middle-container' },
          React.createElement(
            'div',
            { className: 'modal-inner-container', onClick: stopPropagation },
            React.createElement(
              'div',
              { className: 'modal-header' },
              React.createElement(
                'div',
                { className: 'modal-close' },
                React.createElement(
                  'a',
                  { className: 'close', onClick: this.closeModal },
                  React.createElement('i', { className: 'fa fa-times d-icon d-icon-times' })
                )
              ),
              React.createElement(
                'h3',
                null,
                'Insert Hyperlink'
              )
            ),
            React.createElement(
              'div',
              { className: 'modal-body' },
              React.createElement(
                'div',
                null,
                React.createElement('input', {
                  type: 'text',
                  value: url,
                  onChange: this.handleURLChange,
                  placeholder: 'http://example.com',
                  className: 'ember-text-field',
                  onKeyDown: this.handleKeyDown,
                  ref: 'url'
                })
              ),
              React.createElement(
                'div',
                null,
                React.createElement('input', {
                  type: 'text',
                  value: text,
                  onChange: this.handleTextChange,
                  placeholder: 'optional title',
                  className: 'ember-text-field',
                  onKeyDown: this.handleKeyDown
                })
              )
            ),
            React.createElement(
              'div',
              { className: 'modal-footer' },
              React.createElement(
                'button',
                {
                  title: 'OK',
                  className: 'btn-primary btn btn-text',
                  onClick: this.submit
                },
                React.createElement(
                  'span',
                  { className: 'd-button-label' },
                  'OK'
                )
              ),
              React.createElement(
                'button',
                {
                  title: 'Cancel',
                  className: 'btn-danger btn btn-text',
                  onClick: this.closeModal
                },
                React.createElement(
                  'span',
                  { className: 'd-button-label' },
                  'Cancel'
                )
              )
            )
          )
        )
      )
    );
  }

  componentDidUpdate(prevProps, prevState) {
    if (!prevState.modalOpen && this.state.modalOpen) {
      this.addEventHandlers();
      setTimeout(() => {
        this.refs.url.focus();
        this.refs.url.select();
      }, 100);
    }

    if (prevState.modalOpen && !this.state.modalOpen) {
      this.removeEventHandlers();
    }
  }

  handleKeyDown(e) {
    if (e.key === 'Enter') {
      this.submit(e);
    }
  }

  addEventHandlers() {
    $('.BEditor-link-modal').on('keydown.b-editor', e => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.closeModal();
      }
    });
  }

  removeEventHandlers() {
    $('.BEditor-link-modal').off('keydown.b-editor');
  }

  openModal() {
    const { editorState } = this.props;
    const entity = utils.getStartEntity(editorState);

    this.setState({
      modalOpen: true,
      text: '',
      url: entity && entity.type === 'LINK' ? entity.data.url : '',
      entityKey: entity && entity.key
    });
  }

  closeModal() {
    this.setState({
      modalOpen: false,
      text: null,
      url: null,
      entityKey: null
    });
  }

  handleTextChange(e) {
    this.setState({ text: e.target.value });
  }

  handleURLChange(e) {
    this.setState({ url: e.target.value });
  }

  submit() {
    const { url, text, entityKey } = this.state;

    this.context.dispatch('linkupdate', { url, text, entityKey });
    this.closeModal();
  }
}

LinkButton.contextTypes = {
  dispatch: () => null
};

export class UnlinkButton extends React.Component {
  constructor() {
    super(...arguments);
    this.unlink = this.unlink.bind(this);
  }

  render() {
    const { editorState } = this.props;
    const entity = utils.getStartEntity(editorState);

    return React.createElement(StyleButton, {
      disabled: !entity || entity.type !== 'LINK',
      onClick: this.unlink,
      style: 'UNLINK'
    });
  }

  unlink() {
    this.context.dispatch('linkremove');
  }
}

UnlinkButton.contextTypes = {
  dispatch: () => null
};