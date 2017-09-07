const {
  EditorBlock,
  EditorState,
  SelectionState
} = Draft;
import utils from '../utils';
export const TYPE = 'block';

export const blockRenderMap = Immutable.Map({
  'quote': {
    element: 'div'
  }
});

export function blockRendererFn(contentBlock) {
  const type = contentBlock.getType();

    if (type === 'quote') {
      return {
        component: Blockquote,
        editable: true
      };
    }
}

export function reducer(editorState, { name, payload }) {
  if (name === 'quoteadd') {
    const quotes = [payload.quote];
    const html = `<blockquote>${quotes[0].innerHTML}</blockquote>`;
    const quoteContentState = utils.contentStateFromHTML({ html, quotes });

    return utils.addQuoteBlock(
      editorState,
      quoteContentState.blockMap.first()
    );
  }

  if (name === 'change') {
    // Ensure new block at OEF
    if (editorState.getCurrentContent().blockMap.last().type === 'quote') {
      const newBlock = utils.createEmptyBlock();

      editorState = EditorState.set(editorState, {
        currentContent: editorState.getCurrentContent().update(
          'blockMap',
          blockMap => blockMap.set(newBlock.key, newBlock)
        )
      });
    }

    const anchorBlock = utils.getAnchorBlock(editorState);
    const contentState = editorState.getCurrentContent();

    // Set active status of quote block
    const [ nextBlockMap, changed ] = contentState.blockMap.reduce(
      ([ nextBlockMap, changed ], block, key) => {
        if (block.type !== 'quote') {
          return [ nextBlockMap, changed ];
        }

        const blockIsActive = block === anchorBlock;

        if (blockIsActive !== block.data.active) {
          const nextBlock = block.update(
            'data',
            data => _.assign({}, data, { active: blockIsActive })
          );

          return [ nextBlockMap.set(key, nextBlock), true ];
        }

        return [ nextBlockMap, changed ];
      },
      [ contentState.blockMap, false ]
    );

    if (changed) {
      editorState = EditorState.set(editorState, {
        currentContent: contentState.set('blockMap', nextBlockMap)
      });
    }

    return editorState;
  }

  if (name === 'quotejump') {
    const { block, direction } = payload;
    const contentState = editorState.getCurrentContent();
    const [ targetBlock, insertBlock ] = (() => {
      if (direction === 'above') {
        return [
          contentState.getBlockBefore(block.key),
          utils.insertBlockBefore
        ];
      }

      return [
        contentState.getBlockAfter(block.key),
        utils.insertBlockAfter
      ];
    })();

    if (targetBlock && targetBlock.type !== 'quote') {
      return EditorState.forceSelection(
        editorState,
        SelectionState.createEmpty(targetBlock.key)
          .set('anchorOffset', targetBlock.getLength())
          .set('focusOffset', targetBlock.getLength())
      );
    }

    const newBlock = utils.createEmptyBlock();

    return EditorState.forceSelection(
      insertBlock(editorState, block.key, newBlock),
      SelectionState.createEmpty(newBlock.key)
    );
  }

  return editorState;
}

function jump(props, context, direction) {
  return () => context.dispatch('quotejump', {
    block: props.block,
    direction
  });
}

function JumpButton({ className, onClick }) {
  return (
    <div
      contentEditable={false}
      className={`BEditor-jumpButton ${className}`}
      onClick={onClick}
    >
      <svg viewBox={[0, 0, 21, 12]}>
        <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
          <path
            d="M14.4768224,15.3383528 L14.4768224,1.95370621 C14.4768224,0.926881954 13.6365238,0.0867530155 12.6094923,0.0867530155 L7.45877326,0.0867530155 L9.48171425,2.10928564 L8.61029351,2.98053047 L5.0934884,-0.535564717 L8.61029351,-4.0516599 L9.48171425,-3.18041508 L7.45877326,-1.15788245 L12.6406144,-1.15788245 C14.3523337,-1.15788245 15.7528313,0.242332448 15.7528313,1.95370621 L15.7528313,15.3383528 C15.7528313,16.1407697 14.4768224,16.1624961 14.4768224,15.3383528 Z"
            fill="#000000"
            fillRule="nonzero"
            transform="translate(10.723588, 4.570032) scale(-1, 1) rotate(-270.000000) translate(-10.723588, -4.570032)"
          />
        </g>
      </svg>
    </div>
  );
}

const stopPropagation = e => e.stopPropagation();

function Blockquote(props, context) {
  const { selection, block } = props;
  const { avatarURL, username } = block.data;
  const active = selection.getStartKey() === block.key;

    return (
    <aside className="quote" onClick={stopPropagation}>
      {active &&
        <JumpButton
          className="above"
          onClick={jump(props, context, 'above')}
        />
      }
      <div className='title' contentEditable={false}>
        <img className='avatar' src={avatarURL} width={20} height={20} />
        {`${username}:`}
      </div>
      <blockquote>
        <EditorBlock {...props} />
      </blockquote>
      {active &&
       <JumpButton
        className="below"
        onClick={jump(props, context, 'below')}
      />
      }
    </aside>
  );
}

Blockquote.contextTypes = {
  dispatch: () => null
};
