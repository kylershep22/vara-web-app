import React, { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';

export default function EditPostModal({ isOpen, onClose, post, onSave }) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (post) {
      setContent(post.content || '');
      setError('');
    }
  }, [post]);

  if (!isOpen || !post) return null;

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setError('Post content cannot be empty.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ content: trimmed });
      onClose();
    } catch (err) {
      console.error('Failed to save post:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-overlay z-50 flex items-center justify-center p-vara-base">
      <div className="bg-white rounded-vara-lg shadow-vara-lg w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-vara-lg py-vara-base border-b border-divider">
          <h3 className="text-vara-lg font-semibold text-soft-charcoal">Edit Post</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-vara-md hover:bg-dew-sage-light text-muted-sage-gray"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-vara-lg">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="What's on your mind?"
            className="w-full border border-silver-sage rounded-vara-md p-vara-sm text-vara-base text-soft-charcoal focus:border-evergreen-teal focus:outline-none resize-none"
          />
          {error && <p className="text-vara-sm text-soft-coral mt-2">{error}</p>}

          <div className="flex justify-end gap-vara-sm mt-vara-base">
            <button
              onClick={onClose}
              className="px-vara-base py-2 text-vara-sm text-muted-sage-gray hover:bg-dew-sage-light rounded-vara-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-vara-base py-2 bg-evergreen-teal text-white rounded-vara-md text-vara-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-vara-sm"
            >
              {saving && <Loader className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
