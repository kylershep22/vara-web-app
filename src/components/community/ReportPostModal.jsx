import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { submitReport, hidePost } from '../../services/db/moderation.service';

const REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'violence', label: 'Violence or threats' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'misinformation', label: 'Health misinformation' },
  { value: 'other', label: 'Other' },
];

export default function ReportPostModal({ postId, reportedUserId, reporterId, onClose }) {
  const [step, setStep] = useState('reason'); // reason | detail | done
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    setError('');
    try {
      await submitReport(reporterId, postId, reportedUserId, reason, detail);
      await hidePost(reporterId, postId);
      setStep('done');
    } catch (err) {
      if (err.message === 'DUPLICATE_REPORT') {
        setError('You have already reported this post.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-overlay z-50 flex items-center justify-center p-vara-base">
      <div className="bg-white rounded-vara-lg shadow-vara-lg w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-vara-lg py-vara-base border-b border-divider">
          <div className="flex items-center gap-vara-sm">
            <AlertTriangle size={18} className="text-soft-coral" />
            <h3 className="text-vara-lg font-semibold text-soft-charcoal">
              {step === 'done' ? 'Report Submitted' : 'Report Post'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-vara-md hover:bg-dew-sage-light text-muted-sage-gray">
            <X size={18} />
          </button>
        </div>

        <div className="p-vara-lg">
          {step === 'reason' && (
            <>
              <p className="text-vara-sm text-muted-sage-gray mb-vara-base">Why are you reporting this post?</p>
              <div className="space-y-2">
                {REASONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setReason(r.value)}
                    className={`w-full text-left px-vara-base py-3 rounded-vara-md border-2 text-vara-sm font-medium transition-all ${
                      reason === r.value
                        ? 'border-evergreen-teal bg-teal-light text-evergreen-teal'
                        : 'border-divider hover:border-silver-sage text-soft-charcoal'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {reason && (
                <div className="flex justify-end mt-vara-base">
                  <button
                    onClick={() => setStep('detail')}
                    className="px-vara-base py-2 bg-evergreen-teal text-white rounded-vara-md text-vara-sm font-medium hover:opacity-90"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

          {step === 'detail' && (
            <>
              <p className="text-vara-sm text-muted-sage-gray mb-vara-base">
                Anything else you'd like us to know? (optional)
              </p>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={3}
                placeholder="Add additional context..."
                className="w-full border border-silver-sage rounded-vara-md p-vara-sm text-vara-base text-soft-charcoal focus:border-evergreen-teal focus:outline-none mb-vara-base"
              />
              {error && <p className="text-vara-sm text-soft-coral mb-vara-base">{error}</p>}
              <div className="flex justify-end gap-vara-sm">
                <button onClick={() => setStep('reason')} className="px-vara-base py-2 text-vara-sm text-muted-sage-gray hover:bg-dew-sage-light rounded-vara-md">
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-vara-base py-2 bg-evergreen-teal text-white rounded-vara-md text-vara-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-vara-base">
              <CheckCircle size={48} className="text-evergreen-teal mx-auto mb-vara-base" />
              <h4 className="text-vara-base font-semibold text-soft-charcoal mb-2">Thank you</h4>
              <p className="text-vara-sm text-muted-sage-gray mb-vara-lg">
                Your report has been submitted and the post has been hidden from your feed.
              </p>
              <button
                onClick={onClose}
                className="px-vara-lg py-2.5 bg-evergreen-teal text-white rounded-vara-md text-vara-sm font-medium hover:opacity-90"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
