// A step's element is a selector list, "main, fallback": the tour tries the
// selectors in the order they were written, so a fallback only counts when
// the ones before it match nothing. querySelectorAll on the whole list would
// pick whichever comes first in the page instead.

/**
 * The selectors in a selector list, in their order. A comma inside
 * parentheses, brackets or quotes belongs to its selector, as in
 * `:is(.a, .b)` or `[title="a, b"]`.
 *
 * @param {string} list CSS selector list
 * @return {string[]}
 */
export function splitSelectorList(list) {
  const parts = []
  let depth = 0
  let quote = ''
  let start = 0
  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    if (c === '\\') {
      i++
    } else if (quote) {
      if (c === quote) quote = ''
    } else if (c === '"' || c === "'") {
      quote = c
    } else if (c === '(' || c === '[') {
      depth++
    } else if (c === ')' || c === ']') {
      depth = Math.max(0, depth - 1)
    } else if (c === ',' && depth === 0) {
      parts.push(list.slice(start, i))
      start = i + 1
    }
  }
  parts.push(list.slice(start))
  return parts.map(part => part.trim()).filter(Boolean)
}
