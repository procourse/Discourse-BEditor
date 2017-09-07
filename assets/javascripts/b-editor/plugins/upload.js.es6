/* global Draft */
const {
  EditorState,
  SelectionState,
  Modifier
} = Draft;

export function reducer(editorState, { name, payload }) {
  const contentState = editorState.getCurrentContent();
  const selection = editorState.getSelection();

  if (name === 'uploadstart') {
    const contentStateWithEntity = contentState.createEntity('UPLOAD', 'IMMUTABLE');
    const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
    const nextContentState = Modifier.replaceText(contentState, selection, I18n.t('uploading'), editorState.getCurrentInlineStyle(), entityKey);

    return EditorState.push(editorState, nextContentState);
  }

  if (name === 'uploadend') {
    let found = false;
    let placeholderSel = null;

    const contentStateWithEntity = contentState.createEntity(payload.type, payload.mutability, payload.data);

    const newEntityKey = contentStateWithEntity.getLastCreatedEntityKey();
    const text = (() => {
      if (payload.type === 'IMAGE') {
        return payload.data.src;
      }

      if (payload.type === 'LINK') {
        return payload.text;
      }
    })();

    contentState.blockMap.forEach(block => {
      if (found) {
        return;
      }

      block.findEntityRanges(character => {
        const entityKey = character.getEntity();
        return entityKey !== null && contentState.getEntity(entityKey).type === 'UPLOAD';
      }, (start, end) => {
        if (found) {
          return;
        }

        found = true;
        placeholderSel = SelectionState.createEmpty(block.key).set('anchorOffset', start).set('focusOffset', end);
      });
    });

    let nextContentState = Modifier.replaceText(contentStateWithEntity, placeholderSel, text, null, newEntityKey);

    const nextSelection = nextContentState.getSelectionAfter();

    return EditorState.push(editorState, nextContentState);
  }

  return editorState;
}