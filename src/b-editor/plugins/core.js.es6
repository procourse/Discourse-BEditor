/* global Draft */

const {
  EditorState,
  Modifier
} = Draft;

import utils from '../utils';

export function handleKeyCommand(editorState, command) {
  const contentState = editorState.getCurrentContent();

  if (command === 'delete') {
    const anchorBlock = utils.getAnchorBlock(editorState);
    const blockAfter = contentState.getBlockAfter(anchorBlock.key);

    if (
      editorState.getSelection().isCollapsed() &&
      anchorBlock.getLength() === 0 &&
      blockAfter
    ) {
      return utils.deleteBlock(editorState, anchorBlock);
    }
  }

  if (command === 'backspace') {
    const anchorBlock = utils.getAnchorBlock(editorState);
    const blockBefore = contentState.getBlockBefore(anchorBlock.key);

    if (
      editorState.getSelection().isCollapsed() &&
      anchorBlock.getLength() === 0 &&
      !blockBefore &&
      contentState.blockMap.size > 1
    ) {
      return utils.deleteBlock(editorState, anchorBlock);
    }
  }

  if (command === 'split-block') {
    return EditorState.push(
      editorState,
      Modifier.replaceText(
        contentState,
        editorState.getSelection(),
        '\n',
        editorState.getCurrentInlineStyle(),
        utils.getStartEntityKey(editorState)
      )
    );
  }
}
