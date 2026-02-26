/**
 * getHighlightedText
 * Non-React helper for string-based highlighting.
 */
export const getHighlightedText = (text, query) => {
  if (!query || !text) return text;
  return text.replace(new RegExp(`(${query})`, 'gi'), '<strong>$1</strong>');
};
