/* global React, Draft */

import * as utils from './utils';
import toMarkdown from './to-markdown';

import * as CorePlugin from './plugins/core';
import * as BlockquotePlugin from './plugins/blockquote';
import * as ImagePlugin from './plugins/image';
import * as LinkPlugin from './plugins/link';
import * as UploadPlugin from './plugins/upload';

import StyleButton from './style-button';

const {
  Editor,
  EditorState,
  SelectionState,
  RichUtils
} = Draft;

const BLOCK_TYPES = [
  { label: 'UL', style: 'unordered-list-item' },
  { label: 'OL', style: 'ordered-list-item' }
];

const INLINE_STYLES = [
  { label: 'B', style: 'BOLD' },
  { label: 'I', style: 'ITALIC' },
  { label: 'U', style: 'UNDERLINE' }
];

const plugins = [
  CorePlugin,
  BlockquotePlugin,
  ImagePlugin,
  LinkPlugin,
  UploadPlugin
];

export default class BEditor extends React.Component {

  constructor() {
    super(...arguments);

    const findLinkEntities = (block, callback, contentState) => {
      block.findEntityRanges(character => {
        const entityKey = character.getEntity();
        return entityKey !== null && contentState.getEntity(entityKey).type === 'LINK';
      }, callback);
    };

    const findImageEntities = (block, callback, contentState) => {
      block.findEntityRanges(character => {
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

    this.blockRenderMap = Draft.DefaultDraftBlockRenderMap;
    this.reducers = [];
    this.blockRendererFns = [];
    this.keyCommandHandlers = [];

    plugins.forEach(plugin => {
      if (plugin.blockRenderMap) {
        this.blockRenderMap = this.blockRenderMap.merge(plugin.blockRenderMap);
      }

      if (plugin.reducer) {
        this.reducers.push(plugin.reducer);
      }

      if (plugin.blockRendererFn) {
        this.blockRendererFns.push(plugin.blockRendererFn);
      }

      if (plugin.handleKeyCommand) {
        this.keyCommandHandlers.push(plugin.handleKeyCommand);
      }
    });

    this.renderBlock = this.renderBlock.bind(this);
    this.handleEditorClick = this.handleEditorClick.bind(this);
    this.handleWrapperScroll = this.handleWrapperScroll.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleKeyCommand = this.handleKeyCommand.bind(this);
    this.handleTab = this.handleTab.bind(this);

    this.focus = () => this.refs.editor.focus();

    this.toggleBlockType = this.toggleBlockType.bind(this);
    this.toggleInlineStyle = this.toggleInlineStyle.bind(this);

    this.emitValueChange = _.debounce(this.emitValueChange.bind(this), 100);
  }

  getChildContext() {
    return {
      dispatch: this.handleEvent.bind(this)
    };
  }

  render() {
    const { placeholder } = this.props;
    const { editorState } = this.state;
    const startBlock = utils.getStartBlock(editorState);

    const contentState = editorState.getCurrentContent();
    const currentStyle = editorState.getCurrentInlineStyle();

    let className = 'BEditor-editor cooked';

    if (!contentState.hasText()) {
      if (contentState.blockMap.first().type !== 'unstyled') {
        className += ' BEditor-hidePlaceholder';
      }
    }

    return (
      <div className="BEditor-root">
        <div className="BEditor-controls" onClick={this.focus}>
          {INLINE_STYLES.map(type =>
            <StyleButton
              key={type.label}
              active={currentStyle.has(type.style)}
              onClick={this.toggleInlineStyle}
              style={type.style}
            />
          )}
          <div className="BEditor-ctrl-sep" />
            <LinkPlugin.LinkButton
              editorState={editorState}
            />
            <LinkPlugin.UnlinkButton
              editorState={editorState}
            />
          <div className="BEditor-ctrl-sep" />
          {BLOCK_TYPES.map(type =>
            <StyleButton
              key={type.label}
              active={type.style === startBlock.type}
              onClick={this.toggleBlockType}
              style={type.style}
            />
          )}
        </div>
        <div
          className={className}
          onClick={this.handleEditorClick}
          onWheel={this.handleWrapperScroll}
        >
          <Editor
            ref="editor"
            spellCheck
            blockRendererFn={this.renderBlock}
            blockRenderMap={this.blockRenderMap}
            editorState={editorState}
            handleKeyCommand={this.handleKeyCommand}
            onChange={this.handleChange}
            onTab={this.handleTab}
            placeholder={placeholder}
          />
        </div>
      </div>
    );
  }

  renderBlock(block) {
    return this.blockRendererFns.reduce(
      (finalConfig, fn) =>
        finalConfig || fn(block),
      null
    );
  }

  Link({ contentState, children, entityKey }) {
    const { url } = contentState.getEntity(entityKey).getData();
    return <a href={url}>{children}</a>;
  }

  Image({ contentState, entityKey }) {
    const {
      width,
      height,
      src
    } = contentState.getEntity(entityKey).getData();

    return (
      <img
        width={width}
        height={height}
        src={src}
      />
    );
  }

  componentWillMount() {
    this.handlePropsChange();
  }

  componentWillReceiveProps(nextProps) {
    this.handlePropsChange(nextProps);
  }

  handlePropsChange({ html, quotes } = this.props) {
    const contentState = utils.contentStateFromHTML({ html, quotes });

    this.handleChange(
      EditorState.createWithContent(contentState, this.decorator)
    );
  }

  handleEditorClick() {
    const { editorState } = this.state;
    const selection = editorState.getSelection();

    if (!selection.hasFocus) {
      // Focus to the end
      const contentState = editorState.getCurrentContent();
      const lastBlock = contentState.blockMap.last();
      const nextSelection = SelectionState.createEmpty(lastBlock.key)
        .set('anchorOffset', lastBlock.getLength())
        .set('focusOffset', lastBlock.getLength());

      this.handleChange(EditorState.forceSelection(editorState, nextSelection));
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

  handleChange(nextEditorState) {
    nextEditorState = this.reducers.reduce(
      (editorState, reduce) => reduce(editorState, {
        name: 'change',
        prevEditorState: this.state.editorState
      }),
      nextEditorState
    );

    this.setState({ editorState: nextEditorState });
    this.emitValueChange({ editorState: nextEditorState });
  }

  handleKeyCommand(command) {
    const nextEditorState = this.keyCommandHandlers
      .concat(RichUtils.handleKeyCommand)
      .reduce(
        (editorState, handleKeyCommand) =>
          // Only handle once
          editorState || handleKeyCommand(this.state.editorState, command),
          null
      );

    if (nextEditorState) {
      this.handleChange(nextEditorState);
      return true;
    }

    return false;
  }

  handleTab(e) {
    const maxDepth = 4;
    this.handleChange(RichUtils.onTab(e, this.state.editorState, maxDepth));
  }

  toggleBlockType(blockType) {
    this.handleChange(RichUtils.toggleBlockType(this.state.editorState, blockType));
  }

  toggleInlineStyle(inlineStyle) {
    this.handleChange(RichUtils.toggleInlineStyle(this.state.editorState, inlineStyle));
  }

  handleEvent(name, payload) {
    this.handleChange(
      this.reducers.reduce(
        (editorState, handleEvent) =>
          handleEvent(editorState, { name, payload }),
        this.state.editorState
      )
    );
  }

  emitValueChange() {
    const { editorState } = this.state;
    this.props.onValueChange(toMarkdown(editorState.getCurrentContent()));
  }
}

BEditor.childContextTypes = {
  dispatch: () => null
};
