/**
 * Strips markdown formatting from AI responses so they read like
 * natural human writing in the app UI.
 *
 * Handles: headers, bold/italic, bullet lists, numbered lists,
 * horizontal rules, links, images, code blocks, and blockquotes.
 */
function stripMarkdown(text) {
  if (!text || typeof text !== 'string') return text;

  return text
    // Remove code blocks (```...```) - replace with just the content
    .replace(/```[\s\S]*?```/g, (match) =>
      match.replace(/```\w*\n?/g, '').replace(/```/g, '').trim()
    )
    // Remove inline code (`...`)
    .replace(/`([^`]+)`/g, '$1')
    // Remove images ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Convert links [text](url) to just text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove headers (### Header -> Header)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic markers (***text***, **text**, *text*, __text__, _text_)
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    // Remove strikethrough ~~text~~
    .replace(/~~([^~]+)~~/g, '$1')
    // Remove horizontal rules (---, ***, ___)
    .replace(/^[\s]*([-*_]){3,}\s*$/gm, '')
    // Convert bullet lists to plain sentences
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // Convert numbered lists (1. item) to plain text
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove blockquotes
    .replace(/^>\s?/gm, '')
    // Collapse 3+ newlines into 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = stripMarkdown;
