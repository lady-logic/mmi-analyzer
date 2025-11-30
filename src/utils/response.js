/**
 * Response utilities for MCP server
 */

/**
 * Create a success response
 * @param {string|Object} content - Content to return (string or object)
 * @returns {Object} MCP response object
 */
export function createSuccessResponse(content) {
  if (typeof content === 'string') {
    return {
      content: [
        {
          type: 'text',
          text: content
        }
      ]
    };
  }
  
  // If content is already an object with content array, return as is
  if (content && content.content) {
    return content;
  }
  
  // Otherwise wrap in text content
  return {
    content: [
      {
        type: 'text',
        text: typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content)
      }
    ]
  };
}

/**
 * Create an error response
 * @param {string} error - Error message
 * @param {string} [suggestion] - Optional suggestion message
 * @returns {Object} MCP error response object
 */
export function createErrorResponse(error, suggestion) {
  const message = suggestion ? `${error}\n\n${suggestion}` : error;
  return {
    content: [
      {
        type: 'text',
        text: `❌ Error: ${message}`
      }
    ],
    isError: true
  };
}

/**
 * Create a JSON error response (alias for createErrorResponse)
 * @param {string} error - Error message
 * @param {string} [suggestion] - Optional suggestion message
 * @returns {Object} MCP error response object
 */
export function createJsonErrorResponse(error, suggestion) {
  return createErrorResponse(error, suggestion);
}
