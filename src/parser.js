function parseItem(itemElement) {
  const item = {};
  for (const child of itemElement.children) {
    switch (child.tagName) {
      // Existing case handlers for other elements
      case 'media:keywords':
        const keywordsText = child.textContent.trim();
        item.mediaKeywords = keywordsText ? keywordsText.split(',').map(keyword => keyword.trim()) : [];
        break;
      // Other cases
    }
  }
  return item;
}

// Adjustments to output formatting logic to include `mediaKeywords`
function formatItemOutput(item) {
  // Existing logic to format item properties
  if (item.mediaKeywords) {
    // Ensure mediaKeywords are included in the output
  }
  // Continue with formatting
}

// Documentation updates and type definitions to include `mediaKeywords`

// Unit tests for new functionality
describe('parseItem', () => {
  it('should parse media:keywords into an array of keywords', () => {
    // Mock feed data with media:keywords
    // Assertions to verify mediaKeywords is correctly parsed
  });

  it('should handle empty media:keywords gracefully', () => {
    // Mock feed data with empty media:keywords
    // Assertions to verify mediaKeywords is an empty array
  });

  it('should not include mediaKeywords property if media:keywords is absent', () => {
    // Mock feed data without media:keywords
    // Assertions to verify mediaKeywords is not included in the item object
  });
});
