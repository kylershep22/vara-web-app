// src/utils/sanitization.js
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content from rich text editors (TinyMCE, etc.)
 * Allows common formatting tags but strips dangerous elements
 *
 * @param {string} dirty - Unsanitized HTML content
 * @returns {string} Sanitized HTML safe for rendering
 */
export const sanitizeHTML = (dirty) => {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      // Text formatting
      'b', 'i', 'u', 'strong', 'em', 'mark', 'small', 'del', 'ins', 'sub', 'sup',
      // Paragraphs and breaks
      'p', 'br', 'hr',
      // Headings
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // Lists
      'ul', 'ol', 'li',
      // Links
      'a',
      // Quotes and code
      'blockquote', 'code', 'pre',
      // Tables (if needed for journal entries)
      'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',  // Links
      'class',                   // Styling classes
      'colspan', 'rowspan'       // Table attributes
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    // Automatically add rel="noopener noreferrer" to links
    ADD_ATTR: ['target'],
    // Force target="_blank" links to have rel="noopener noreferrer"
    SAFE_FOR_TEMPLATES: true
  });
};

/**
 * Sanitizes rich text content for journal entries
 * More permissive than general HTML sanitization
 *
 * @param {string} dirty - Unsanitized journal content
 * @returns {string} Sanitized journal content
 */
export const sanitizeJournalEntry = (dirty) => {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b', 'i', 'u', 'strong', 'em', 'mark', 'small', 'del', 'ins', 'sub', 'sup',
      'p', 'br', 'hr',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a',
      'blockquote', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img' // Allow images in journal entries
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',
      'class', 'id',
      'colspan', 'rowspan',
      'src', 'alt', 'width', 'height' // Image attributes
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    ADD_ATTR: ['target'],
    SAFE_FOR_TEMPLATES: true
  });
};

/**
 * Strips all HTML tags and returns plain text
 * Use for: profile names, group names, simple text fields
 *
 * @param {string} text - Text that might contain HTML
 * @returns {string} Plain text with all HTML stripped
 */
export const sanitizeText = (text) => {
  if (!text) return '';

  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

/**
 * Sanitizes user bio/description fields
 * Allows very basic formatting but no links or complex structures
 *
 * @param {string} bio - User bio text
 * @returns {string} Sanitized bio
 */
export const sanitizeBio = (bio) => {
  if (!bio) return '';

  return DOMPurify.sanitize(bio, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
    ALLOWED_ATTR: []
  });
};

/**
 * Sanitizes group/post titles
 * Strips all HTML to prevent XSS in titles
 *
 * @param {string} title - Title text
 * @returns {string} Plain text title
 */
export const sanitizeTitle = (title) => {
  if (!title) return '';

  // Strip all HTML
  const cleaned = DOMPurify.sanitize(title, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });

  // Trim whitespace and limit length
  return cleaned.trim().substring(0, 200);
};

/**
 * Sanitizes search queries and user input
 * Removes special characters that could be used for injection
 *
 * @param {string} query - Search query
 * @returns {string} Sanitized query
 */
export const sanitizeSearchQuery = (query) => {
  if (!query) return '';

  // Strip HTML
  const cleaned = DOMPurify.sanitize(query, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });

  // Remove potentially dangerous characters while keeping spaces and basic punctuation
  return cleaned.replace(/[^\w\s\-.,!?']/gi, '').trim();
};

/**
 * Validates and sanitizes URLs
 * Ensures URLs are safe before using them
 *
 * @param {string} url - URL to validate
 * @returns {string|null} Sanitized URL or null if invalid
 */
export const sanitizeURL = (url) => {
  if (!url) return null;

  try {
    const urlObj = new URL(url);

    // Only allow http, https, and mailto protocols
    if (!['http:', 'https:', 'mailto:'].includes(urlObj.protocol)) {
      return null;
    }

    return urlObj.href;
  } catch (e) {
    // Invalid URL
    return null;
  }
};

/**
 * Sanitizes file names for uploads
 * Removes dangerous characters from file names
 *
 * @param {string} filename - Original filename
 * @returns {string} Safe filename
 */
export const sanitizeFilename = (filename) => {
  if (!filename) return 'untitled';

  // Remove path separators and dangerous characters
  const cleaned = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length
  return cleaned.substring(0, 255);
};

/**
 * Validates file type against allowed types
 *
 * @param {File} file - File object
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @returns {boolean} Whether file type is allowed
 */
export const isValidFileType = (file, allowedTypes) => {
  if (!file || !file.type) return false;
  return allowedTypes.includes(file.type);
};

/**
 * Validates file size
 *
 * @param {File} file - File object
 * @param {number} maxSizeInMB - Maximum file size in megabytes
 * @returns {boolean} Whether file size is within limit
 */
export const isValidFileSize = (file, maxSizeInMB) => {
  if (!file || !file.size) return false;
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

/**
 * Comprehensive file validation for image uploads
 *
 * @param {File} file - File object to validate
 * @param {Object} options - Validation options
 * @param {number} options.maxSizeMB - Maximum file size in MB (default: 5)
 * @param {string[]} options.allowedTypes - Allowed MIME types (default: images)
 * @returns {Object} Validation result { valid: boolean, error: string }
 */
export const validateImageUpload = (file, options = {}) => {
  const {
    maxSizeMB = 5,
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif']
  } = options;

  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Debug logging
  console.log('Validating file:', {
    name: file.name,
    type: file.type,
    size: file.size,
    allowedTypes
  });

  // Check file type
  if (!isValidFileType(file, allowedTypes)) {
    console.error('File type validation failed:', {
      receivedType: file.type,
      allowedTypes,
      fileName: file.name
    });
    return { valid: false, error: 'Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP, or AVIF)' };
  }

  // Check file size
  if (!isValidFileSize(file, maxSizeMB)) {
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }

  // Validate filename
  if (!file.name || file.name.length > 255) {
    return { valid: false, error: 'Invalid filename' };
  }

  return { valid: true, error: null };
};
