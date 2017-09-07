const {
  EditorState,
  SelectionState,
  Modifier
} = Draft;

const ZERO_WIDTH_CHAR = '\u200B';

export function reducer(editorState, payload) {
  const { name } = payload;
  const contentState = editorState.getCurrentContent();

  if (name === 'change') {
    let zeroWidthCharsOffsets = [];
    contentState.blockMap.forEach((block, key) => {
      block.findEntityRanges(
        character => {
          const entityKey = character.getEntity();
          return entityKey !== null && contentState.getEntity(entityKey).type === 'IMAGE';
        },
        (start, end) => {
          const charAfter = block.getText().substr(end, 1);

          if (charAfter !== ZERO_WIDTH_CHAR) {
            zeroWidthCharsOffsets.push([ key, end ]);
          }
        }
      );
    });

    const nextContentState = zeroWidthCharsOffsets.reduce(
      (contentState, [ key, offset ]) =>
        Modifier.insertText(
          contentState,
          SelectionState.createEmpty(key)
            .set('anchorOffset', offset)
            .set('focusOffset', offset),
          ZERO_WIDTH_CHAR
        ),
      contentState
    );

    if (nextContentState !== contentState) {
      return EditorState.set(editorState, {
        currentContent: nextContentState
      });
    }
  }

  return editorState;
}
