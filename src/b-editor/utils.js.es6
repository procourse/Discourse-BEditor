const {
  Editor,
  EditorState,
  SelectionState,
  ContentState,
  ContentBlock,
  CharacterMetadata,
  RichUtils
} = Draft;

const { List } = Immutable;

export function contentStateFromHTML({ html, quotes }) {
  let quoteIndex = 0;
  const res = Draft.convertFromHTML(html);
  const contentBlocks = res.contentBlocks.map(block => {
    if (block.text === '\u200B') {
      return new ContentBlock;
    }

    if (block.type === 'blockquote') {
      return block.set('type', 'quote').set('data', quotes[quoteIndex++]);
    }

    return block;
  });

  return ContentState.createFromBlockArray(contentBlocks, res.entityMap);
}

export function createEmptyBlock() {
  return new ContentBlock({
    key: Draft.genKey(),
    type: 'unstyled',
    text: '',
    characterList: Immutable.List()
  });
}

function insertBlock(position, editorState, targetKey, blockToInsert, silent) {
  const contentState = editorState.getCurrentContent();
  const nextContentState = contentState.update(
    'blockMap',
    blockMap => blockMap.flatMap((block, key) => {
      if (key !== targetKey) {
        return  List.of([ key, block ]);
      }

      switch (position) {
      case 'before':
        return List.of(
          [ blockToInsert.key, blockToInsert ],
          [ key, block ]
        );

      case 'after':
        return List.of(
          [ key, block ],
          [ blockToInsert.key, blockToInsert ]
        );

      case null:
        return List.of([ blockToInsert.key, blockToInsert ]);
      }
    })
  );

  if (silent) {
    return EditorState.push(
      EditorState.undo(editorState),
      nextContentState
    );
  }

  return EditorState.push(
    editorState,
    nextContentState
  );
}

export const insertBlockBefore = insertBlock.bind(null, 'before');
export const insertBlockAfter = insertBlock.bind(null, 'after');
export const replaceBlock = insertBlock.bind(null, null);

export function addQuoteBlock(editorState, quoteBlock) {
  const blockAtCursor = getStartBlock(editorState);
  const contentState = editorState.getCurrentContent();
  const blockAfter = contentState.getBlockAfter(blockAtCursor.key);

  const shouldReplace = (
    blockAtCursor.type !== 'quote' &&
    blockAtCursor.getLength() === 0
  );

  let nextEditorState = shouldReplace ?
    replaceBlock(editorState, blockAtCursor.key, quoteBlock) :
    insertBlockAfter(editorState, blockAtCursor.key, quoteBlock);

  const shouldInsertEmptyBlock = !blockAfter || blockAfter.type === 'quote';

  if (shouldInsertEmptyBlock) {
    nextEditorState = insertBlockAfter(
      nextEditorState,
      quoteBlock.key,
      createEmptyBlock(),
      true
    );
  }

  const nextContentState = nextEditorState.getCurrentContent();

  return EditorState.forceSelection(
    nextEditorState,
    SelectionState.createEmpty(nextContentState.getKeyAfter(quoteBlock.key))
  );
}

export function getAnchorBlock(editorState) {
  const selection = editorState.getSelection();
  const contentState = editorState.getCurrentContent();

  return contentState.getBlockForKey(selection.getAnchorKey());
}

export function getStartBlock(editorState) {
  const selection = editorState.getSelection();
  const contentState = editorState.getCurrentContent();

  return contentState.getBlockForKey(selection.getStartKey());
}

export function deleteBlock(editorState, block) {
  const contentState = editorState.getCurrentContent();

  return EditorState.forceSelection(
    EditorState.push(
      editorState,
      contentState.update(
        'blockMap',
        blockMap => blockMap.filterNot(b => b === block)
      )
    ),
    SelectionState.createEmpty(contentState.getKeyAfter(block.key))
  );
}

export function getStartEntityKey(editorState) {
  const selection = editorState.getSelection();
  const startBlock = getStartBlock(editorState);
  return startBlock && startBlock.getEntityAt(selection.getStartOffset());
}

export function getStartEntity(editorState) {
  const entityKey = getStartEntityKey(editorState);
  return entityKey && editorState.getCurrentContent().getEntity(entityKey);
}

export function getEntityRanges(text, charMetaList) {
  let charEntity = null;
  let prevCharEntity = null;
  let ranges = [];
  let rangeStart = 0;
  for (let i = 0, len = text.length; i < len; i++) {
    prevCharEntity = charEntity;
    let meta = charMetaList.get(i);
    charEntity = meta ? meta.getEntity() : null;
    if (i > 0 && charEntity !== prevCharEntity) {
      ranges.push([
        prevCharEntity,
        getStyleRanges(
          text.slice(rangeStart, i),
          charMetaList.slice(rangeStart, i)
        ),
      ]);
      rangeStart = i;
    }
  }
  ranges.push([
    charEntity,
    getStyleRanges(
      text.slice(rangeStart),
      charMetaList.slice(rangeStart)
    ),
  ]);
  return ranges;
}

function getStyleRanges(text, charMetaList) {
  let charStyle = new Immutable.OrderedSet();
  let prevCharStyle = new Immutable.OrderedSet();
  let ranges = [];
  let rangeStart = 0;
  for (let i = 0, len = text.length; i < len; i++) {
    prevCharStyle = charStyle;
    let meta = charMetaList.get(i);
    charStyle = meta ? meta.getStyle() : new Immutable.OrderedSet();
    if (i > 0 && !Immutable.is(charStyle, prevCharStyle)) {
      ranges.push([text.slice(rangeStart, i), prevCharStyle]);
      rangeStart = i;
    }
  }
  ranges.push([text.slice(rangeStart), charStyle]);
  return ranges;
}
