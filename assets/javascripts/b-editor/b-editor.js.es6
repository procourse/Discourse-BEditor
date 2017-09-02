/* global React, Immutable, Draft */

import * as utils from './utils';
import toMarkdown from './to-markdown';
import * as BlockquotePlugin from './plugins/blockquote';
import StyleButton from './style-button';
import Blockquote from './blockquote';
import LinkButton from './link-button';

const {
  Editor,
  EditorState,
  SelectionState,
  RichUtils,
  Modifier
} = Draft;

const BLOCK_TYPES = [{ label: 'UL', style: 'unordered-list-item' }, { label: 'OL', style: 'ordered-list-item' }];

const INLINE_STYLES = [{ label: 'B', style: 'BOLD' }, { label: 'I', style: 'ITALIC' }, { label: 'U', style: 'UNDERLINE' }];

const plugins = [BlockquotePlugin];

export default class BEditor extends React.Component {
  constructor(props) {
    super(props);

    const findLinkEntities = (contentBlock, callback, contentState) => {
      contentBlock.findEntityRanges(character => {
        const entityKey = character.getEntity();
        return entityKey !== null && contentState.getEntity(entityKey).type === 'LINK';
      }, callback);
    };

    const findImageEntities = (contentBlock, callback, contentState) => {
      contentBlock.findEntityRanges(character => {
        const entityKey = character.getEntity();
        return entityKey !== null && contentState.getEntity(entityKey).type === 'IMAGE';
      }, callback);
    };

    this.props.subscribe(this.handleEvent.bind(this));

    this.decorator = new Draft.CompositeDecorator([{
      strategy: findLinkEntities,
      component: this.Link
    }, {
      strategy: findImageEntities,
      component: this.Image
    }]);

    this.state = {
      editorState: EditorState.createEmpty()
    };

    this.blockRenderMap = Draft.DefaultDraftBlockRenderMap.merge(Immutable.Map({
      'quote': {
        element: 'div'
      }
    }));

    this.eventHandlers = [];
    this.blockRendererFns = [];

    plugins.forEach(plugin => {
      if (plugin.blockRenderMap) {
        this.blockRenderMap = this.blockRenderMap.merge(plugin.blockRenderMap);
      }

      if (plugin.handleEvent) {
        this.eventHandlers.push(plugin.eventHandlers);
      }

      if (plugin.blockRendererFn) {
        this.blockRendererFns.push(plugin.blockRendererFn);
      }
    });

    this.renderBlock = this.renderBlock.bind(this);
    this.handleEditorClick = this.handleEditorClick.bind(this);
    this.handleWrapperScroll = this.handleWrapperScroll.bind(this);
    this.setEditorState = this.setEditorState.bind(this);
    this.handleKeyCommand = this.handleKeyCommand.bind(this);
    this.handleTab = this.handleTab.bind(this);

    this.focus = () => this.refs.editor.focus();

    this.updateLink = this.updateLink.bind(this);
    this.unlink = this.unlink.bind(this);
    this.toggleBlockType = this.toggleBlockType.bind(this);
    this.toggleInlineStyle = this.toggleInlineStyle.bind(this);

    this.emitValueChange = _.debounce(this.emitValueChange.bind(this), 100);
  }

  render() {
    const { placeholder } = this.props;
    const { editorState } = this.state;
    const startBlock = utils.getStartBlock(editorState);
    const startEntity = utils.getStartEntity(editorState);

    const contentState = editorState.getCurrentContent();
    const currentStyle = editorState.getCurrentInlineStyle();

    let className = 'BEditor-editor cooked';

    if (!contentState.hasText()) {
      if (contentState.blockMap.first().type !== 'unstyled') {
        className += ' BEditor-hidePlaceholder';
      }
    }

    return React.createElement(
      'div',
      { className: 'BEditor-root' },
      React.createElement(
        'div',
        { className: 'BEditor-controls', onClick: this.focus },
        INLINE_STYLES.map(type => React.createElement(StyleButton, {
          key: type.label,
          active: currentStyle.has(type.style),
          onClick: this.toggleInlineStyle,
          style: type.style
        })),
        React.createElement('div', { className: 'BEditor-ctrl-sep' }),
        React.createElement(LinkButton, {
          editorState: editorState,
          onRequestChange: this.updateLink
        }),
        React.createElement(StyleButton, {
          disabled: !startEntity || startEntity.type !== 'LINK',
          onClick: this.unlink,
          style: 'UNLINK'
        }),
        React.createElement('div', { className: 'BEditor-ctrl-sep' }),
        BLOCK_TYPES.map(type => React.createElement(StyleButton, {
          key: type.label,
          active: type.style === startBlock.type,
          onClick: this.toggleBlockType,
          style: type.style
        }))
      ),
      React.createElement(
        'div',
        {
          className: className,
          onClick: this.handleEditorClick,
          onWheel: this.handleWrapperScroll
        },
        React.createElement(Editor, {
          ref: 'editor',
          spellCheck: true,
          blockRendererFn: this.renderBlock,
          blockRenderMap: this.blockRenderMap,
          editorState: editorState,
          handleKeyCommand: this.handleKeyCommand,
          onChange: this.setEditorState,
          onTab: this.handleTab,
          placeholder: placeholder
        })
      )
    );
  }

  renderBlock(contentBlock) {
    return this.blockRendererFns.reduce((finalConfig, fn) => finalConfig || fn(contentBlock), null);
  }

  Link({ contentState, children, entityKey }) {
    const { url } = contentState.getEntity(entityKey).getData();
    return React.createElement(
      'a',
      { href: url },
      children
    );
  }

  Image({ contentState, entityKey }) {
    const {
      width,
      height,
      src
    } = contentState.getEntity(entityKey).getData();

    return React.createElement('img', { src: src, width: width, height: height });
  }

  componentWillMount() {
    this.handlePropsChange();
  }

  componentWillReceiveProps(nextProps) {
    this.handlePropsChange(nextProps);
  }

  handlePropsChange({ html, quotes } = this.props) {
    const contentState = utils.contentStateFromHTML({ html, quotes });

    this.setEditorState(EditorState.createWithContent(contentState, this.decorator));
  }

  handleEditorClick() {
    const { editorState } = this.state;
    const selection = editorState.getSelection();

    if (!selection.hasFocus) {
      // Focus to the end
      const contentState = editorState.getCurrentContent();
      const lastBlock = contentState.blockMap.last();
      const nextSelection = SelectionState.createEmpty(lastBlock.key).set('anchorOffset', lastBlock.getLength()).set('focusOffset', lastBlock.getLength());

      this.setEditorState(EditorState.forceSelection(editorState, nextSelection));
    }
  }

  handleWrapperScroll(e) {
    // These code is to prevent scroll event's propagation to body
    const el = e.currentTarget;

    if (e.nativeEvent.deltaY <= 0) {
      // scrolling up
      if (el.scrollTop <= 0) {
        e.preventDefault();
      }
    } else {
      // scrolling down
      if (el.scrollTop + el.clientHeight >= el.scrollHeight) {
        e.preventDefault();
      }
    }
  }

  setEditorState(nextEditorState) {
    const { editorState } = this.state;

    if (nextEditorState.getCurrentContent().blockMap.last().type === 'quote') {
      const newBlock = utils.createEmptyBlock();

      nextEditorState = EditorState.set(nextEditorState, {
        currentContent: nextEditorState.getCurrentContent().update('blockMap', blockMap => blockMap.set(newBlock.key, newBlock))
      });
    }

    this.setState({ editorState: nextEditorState });
    this.emitValueChange({ editorState });
  }

  handleKeyCommand(command) {
    const { editorState } = this.state;
    const contentState = editorState.getCurrentContent();

    if (command === 'delete') {
      const anchorBlock = utils.getAnchorBlock(editorState);
      const blockAfter = contentState.getBlockAfter(anchorBlock.key);

      if (editorState.getSelection().isCollapsed() && anchorBlock.getLength() === 0 && blockAfter) {
        this.setEditorState(utils.deleteBlock(editorState, anchorBlock));
        return true;
      }
    }

    if (command === 'backspace') {
      const anchorBlock = utils.getAnchorBlock(editorState);
      const blockBefore = contentState.getBlockBefore(anchorBlock.key);

      if (editorState.getSelection().isCollapsed() && anchorBlock.getLength() === 0 && !blockBefore && contentState.blockMap.size > 1) {
        this.setEditorState(utils.deleteBlock(editorState, anchorBlock));
        return true;
      }
    }

    if (command === 'split-block') {
      this.insertSoftNewline();
      return true;
    }

    // Default
    const nextEditorState = RichUtils.handleKeyCommand(editorState, command);

    if (nextEditorState) {
      this.setEditorState(nextEditorState);
      return true;
    }

    return false;
  }

  handleTab(e) {
    const maxDepth = 4;
    this.setEditorState(RichUtils.onTab(e, this.state.editorState, maxDepth));
  }

  updateLink(e, { url, text }) {
    const { editorState } = this.state;
    const contentState = editorState.getCurrentContent();
    const inlineStyle = editorState.getCurrentInlineStyle();
    const startEntity = utils.getStartEntity(editorState);
    const startEntityKey = utils.getStartEntityKey(editorState);
    const selection = editorState.getSelection();

    const selectedLinkURL = startEntity && startEntity.type === 'LINK' ? startEntity.data.url : null;

    if (text === '' && selectedLinkURL !== null) {
      return this.setEditorState(EditorState.push(editorState, contentState.mergeEntityData(startEntityKey, {
        url: url
      })));
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
      return this.setEditorState(RichUtils.toggleLink(nextEditorState, nextEditorState.getSelection(), nextEntityKey));
    }

    return this.setEditorState(EditorState.push(editorState, Modifier.replaceText(nextContentState, selection, text === '' ? url : text, inlineStyle, nextEntityKey)));
  }

  unlink() {
    const { editorState } = this.state;
    const contentState = editorState.getCurrentContent();
    const selection = editorState.getSelection();
    const startBlock = utils.getStartBlock(editorState);
    const startEntityKey = utils.getStartEntityKey(editorState);

    startBlock.findEntityRanges(char => {
      const entityKey = char.getEntity();
      return entityKey === startEntityKey;
    }, (start, end) => {
      this.setEditorState(EditorState.forceSelection(EditorState.push(editorState, Modifier.applyEntity(contentState, SelectionState.createEmpty(startBlock.key).set('anchorOffset', start).set('focusOffset', end), null)), selection));
    });
  }

  insertSoftNewline() {
    const { editorState } = this.state;

    return this.setEditorState(EditorState.push(editorState, Modifier.replaceText(editorState.getCurrentContent(), editorState.getSelection(), '\n', editorState.getCurrentInlineStyle(), utils.getStartEntityKey(editorState))));
  }

  toggleBlockType(blockType) {
    this.setEditorState(RichUtils.toggleBlockType(this.state.editorState, blockType));
  }

  toggleInlineStyle(inlineStyle) {
    this.setEditorState(RichUtils.toggleInlineStyle(this.state.editorState, inlineStyle));
  }

  handleBlockquoteJump(e, block, direction) {
    const { editorState } = this.state;
    const contentState = editorState.getCurrentContent();
    const [targetBlock, insertBlock] = (() => {
      if (direction === 'above') {
        return [contentState.getBlockBefore(block.key), utils.insertBlockBefore];
      }

      return [contentState.getBlockAfter(block.key), utils.insertBlockAfter];
    })();

    if (targetBlock && targetBlock.type !== 'quote') {
      return this.setEditorState(EditorState.forceSelection(editorState, SelectionState.createEmpty(targetBlock.key).set('anchorOffset', targetBlock.getLength()).set('focusOffset', targetBlock.getLength())));
    }

    const newBlock = utils.createEmptyBlock();

    return this.setEditorState(EditorState.forceSelection(insertBlock(editorState, block.key, newBlock), SelectionState.createEmpty(newBlock.key)));
  }

  handleEvent(eventName, ...args) {
    const editorState = this.eventHandlers.reduce((editorState, handleEvent) => handleEvent(editorState, eventName, ...args), this.state.editorState);

    this.setEditorState(editorState);

    /*
    const contentState = editorState.getCurrentContent();
    const selection = editorState.getSelection();
     switch(eventName) {
      case 'uploadstart': {
        const contentStateWithEntity = contentState.createEntity(
          'UPLOAD',
          'IMMUTABLE'
        );
        const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
        const nextContentState = Modifier.replaceText(
          contentState,
          selection,
          I18n.t('uploading'),
          editorState.getCurrentInlineStyle(),
          entityKey
        );
         this.setEditorState(EditorState.push(
          editorState,
          nextContentState
        ));
         break;
      }
       case 'uploadend': {
        const params = args[0];
        let found = false;
        let placeholderSel = null;
         const contentStateWithEntity = contentState.createEntity(
          params.type,
          params.mutability,
          params.data
        );
         const newEntityKey = contentStateWithEntity.getLastCreatedEntityKey();
        const text = (() => {
          if (params.type === 'IMAGE') {
            return params.data.src;
          }
           if (params.type === 'LINK') {
            return params.text;
          }
        })();
         contentState.blockMap.forEach(block => {
          if (found) {
            return;
          }
           block.findEntityRanges(
            character => {
              const entityKey = character.getEntity();
              return (
                entityKey !== null &&
                contentState.getEntity(entityKey).type === 'UPLOAD'
              );
            },
            (start, end) => {
              if (found) {
                return;
              }
               found = true;
              placeholderSel = SelectionState.createEmpty(block.key)
                .set('anchorOffset', start)
                .set('focusOffset', end);
            }
          );
        });
         const nextContentState = Modifier.replaceText(
          contentStateWithEntity,
          placeholderSel,
          text,
          null,
          newEntityKey
        );
         this.setEditorState(EditorState.push(
          editorState,
          nextContentState
        ));
        break;
      }
    }
    */
  }

  emitValueChange() {
    const { editorState } = this.state;
    this.props.onValueChange(toMarkdown(editorState.getCurrentContent()));
  }
}