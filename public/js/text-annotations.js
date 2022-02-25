function getRange(anno) {
  const start = document.evaluate(
    anno.on.selector.item.startSelector.value,
    document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
  ).singleNodeValue;

  const end = document.evaluate(
    anno.on.selector.item.endSelector.value,
    document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
  ).singleNodeValue;

  const siblings = nextUntil(start, end);

  return [...new Set([start, ...siblings, start])]
}

function insertLinks(anno, page) {
  const links = [];
  const selectedWords = getRange(anno);
  const startOffset = anno.on.selector.item.startSelector.refinedBy.start;
  const endOffset = anno.on.selector.item.endSelector.refinedBy.end;
  if (selectedWords.length == 0) return;
  if (selectedWords.length == 1) {
    links.push(handelPart(selectedWords.pop(), { startOffset, endOffset }));
  } else {
    links.push(handelStart(selectedWords.shift(), startOffset));
    links.push(handelEnd(selectedWords.pop(), endOffset));
  }
  if (selectedWords.length > 0) {
    selectedWords.forEach(wordElement => {
      links.push(wrapWord(wordElement));
    });
  }

  return links;
}

function handelStart(wordElement, offset) {
  if (!wordElement) return;
  const word = wordElement.innerText;
  const link = createLink(wordElement);
  link.innerText = word.slice(offset, word.length);
  wordElement.innerHTML = `${word.slice(0, offset)}`;
  wordElement.append(link);
  return link;
}

function handelEnd(wordElement, offset) {
  if (!wordElement) return;
  const word = wordElement.innerText;
  const link = createLink(wordElement);
  link.innerText = word.slice(0, offset);
  wordElement.innerHTML = word.slice(offset, word.length);
  wordElement.prepend(link);
  return link;
}

function handelPart(wordElement, range) {
  try {
    const word = wordElement.innerText;
    const link = createLink(wordElement);
    const start = word.slice(0, range.startOffset);
    const end = word.slice(range.endOffset, word.length);
    link.innerText = word.slice(range.startOffset, range.endOffset);
    wordElement.innerHTML = start;
    wordElement.append(link);
    wordElement.append(end);
    return link;
  } catch (error) {
    handelPart(wordElement, range);
  }
}

function wrapWord(wordElement) {
  const word = wordElement.innerText;
  const link = createLink(wordElement);
  link.innerText = word;
  wordElement.innerHTML = '';
  wordElement.append(link);
  return link;
}

function createLink(wordElement) {
  const link = document.createElement('a');
  link.setAttribute('href', '#');
  link.setAttribute('title', wordElement.id);
  link.className = `word-${wordElement.id}`;
  return link;
}

/*!
 * Get all following siblings of each element up to but not including the element matched by the selector
 * adapted from example from Chris Ferdinandi, https://gomakethings.com
 * found at https://vanillajstoolkit.com/helpers/nextuntil/
 * @param  {Node}   start    The starting element
 * @param  {String} end      The final element
 * @return {Array}           The siblings
 */
function nextUntil(start, end) {
	// Setup siblings array
	const siblings = [];

  if (start == end) return siblings;

	// Get the next sibling element
	let elem = start.nextElementSibling;

	// As long as a sibling exists
	while (elem) {

		// If we've reached our match, bail
    if (elem == end) break;

		// Otherwise, push it to the siblings array
		siblings.push(elem);

		// Get the next sibling element
		elem = elem.nextElementSibling;
	}

	return siblings;
};