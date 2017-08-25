import utils from './utils';
import JumpButton from './jump-button';

const { EditorBlock } = Draft;

const stopPropagation = e => e.stopPropagation();
export default class Blockquote extends React.Component {

  constructor() {
    super(...arguments);

    this.jumpAbove = e => this.props.onJump(e, this.props.block, 'above');
    this.jumpBelow = e => this.props.onJump(e, this.props.block, 'below');
  }

  render() {
    const { contentState, selection, block, active } = this.props;
    const { avatarURL, username } = block.data;

    return React.createElement(
      'aside',
      { className: 'quote', onClick: stopPropagation },
      active && React.createElement(JumpButton, { className: 'above', onClick: this.jumpAbove }),
      React.createElement(
        'div',
        { className: 'title', contentEditable: false },
        React.createElement('img', { className: 'avatar', src: avatarURL, width: 20, height: 20 }),
        `${username}:`
      ),
      React.createElement(
        'blockquote',
        null,
        React.createElement(EditorBlock, this.props)
      ),
      active && React.createElement(JumpButton, { className: 'below', onClick: this.jumpBelow })
    );
  }
}