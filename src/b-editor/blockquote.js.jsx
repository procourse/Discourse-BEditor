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
    const { block, active } = this.props;
     const { avatarURL, username } = block.data;

     return (
       <aside className="quote" onClick={stopPropagation}>
         {active &&
          <JumpButton className="above" onClick={this.jumpAbove} />
        }
         <div className='title' contentEditable={false}>
           <img className='avatar' src={avatarURL} width={20} height={20} />
           {`${username}:`}
         </div>
         <blockquote>
           <EditorBlock {...this.props} />
         </blockquote>
         {active &&
          <JumpButton className="below" onClick={this.jumpBelow} />
        }
       </aside>
     );
  }
}
