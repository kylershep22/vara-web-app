import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SidebarLayout from '../../components/layout/SidebarLayout';
import {
  Trophy, Plus, Calendar, Users, Target, Clock, Filter,
  ArrowLeft, Flame, CheckCircle, Loader,
} from 'lucide-react';
import {
  fetchChallenges,
  createChallenge,
  getDaysRemaining,
  getChallengeProgress,
  formatChallengeDuration,
} from '../../services/db/challenges.service';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' },
];

const CATEGORY_OPTIONS = [
  { value: 'fitness', label: 'Fitness' },
  { value: 'mindfulness', label: 'Mindfulness' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'habits', label: 'Habits' },
  { value: 'accountability', label: 'Accountability' },
  { value: 'other', label: 'Other' },
];

export default function ChallengesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchChallenges(filter, user?.uid);
      setChallenges(data);
    } catch (err) {
      console.error('Error loading challenges:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, user?.uid]);

  useEffect(() => { load(); }, [load]);

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'my', label: 'My Challenges' },
    { key: 'active', label: 'Active' },
    { key: 'public', label: 'Discover' },
  ];

  return (
    <SidebarLayout>
      <div className="max-w-5xl mx-auto px-vara-base py-vara-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-vara-lg">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/community')} className="p-2 rounded-vara-md hover:bg-dew-sage-light text-muted-sage-gray">
              <ArrowLeft size={20} />
            </button>
            <Trophy className="text-evergreen-teal" size={28} />
            <div>
              <h1 className="text-vara-2xl font-semibold text-evergreen-teal tracking-tight">Challenges</h1>
              <p className="text-vara-sm text-muted-sage-gray">Time-limited goals with your community</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-vara-base py-2.5 bg-evergreen-teal text-white rounded-vara-md text-vara-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={18} /> New Challenge
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-dew-sage-light rounded-vara-lg mb-vara-lg w-fit">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-vara-base py-2 rounded-vara-md text-vara-sm font-medium transition-all ${
                filter === f.key
                  ? 'bg-white text-evergreen-teal shadow-vara-sm'
                  : 'text-muted-sage-gray hover:text-soft-charcoal'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="animate-spin text-evergreen-teal" size={24} />
          </div>
        ) : challenges.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="mx-auto mb-4 text-silver-sage" size={48} />
            <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-2">No challenges yet</h3>
            <p className="text-vara-sm text-muted-sage-gray mb-6">
              {filter === 'my' ? 'Join or create a challenge to get started' : 'Be the first to create a challenge'}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-vara-base py-2.5 bg-evergreen-teal text-white rounded-vara-md text-vara-sm font-medium hover:opacity-90"
            >
              Create Challenge
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-vara-base">
            {challenges.map((c) => (
              <ChallengeCard key={c.id} challenge={c} userId={user?.uid} onClick={() => navigate(`/community/challenges/${c.id}`)} />
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreate && (
          <CreateChallengeModal
            onClose={() => setShowCreate(false)}
            onCreate={async (input) => {
              await createChallenge(input);
              setShowCreate(false);
              load();
            }}
          />
        )}
      </div>
    </SidebarLayout>
  );
}

function ChallengeCard({ challenge, userId, onClick }) {
  const isMember = challenge.members?.includes(userId);
  const daysLeft = getDaysRemaining(challenge.endDate);
  const status = challenge.status || 'active';
  const duration = formatChallengeDuration(challenge.startDate, challenge.endDate);

  const statusColors = {
    active: 'bg-teal-light text-evergreen-teal',
    upcoming: 'bg-golden-apricot/15 text-golden-apricot',
    completed: 'bg-dew-sage-light text-muted-sage-gray',
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-vara-lg border border-divider shadow-vara-sm hover:shadow-vara-md transition-all cursor-pointer p-vara-lg"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-vara-md">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-medium to-evergreen-teal rounded-vara-lg flex items-center justify-center shadow-vara-sm">
            <Trophy className="text-white" size={22} />
          </div>
          <div>
            <h3 className="font-semibold text-soft-charcoal text-vara-base line-clamp-1">{challenge.name}</h3>
            <span className="text-vara-xs text-muted-sage-gray">{duration}</span>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-vara-pill text-vara-xs font-medium ${statusColors[status] || statusColors.active}`}>
          {status}
        </span>
      </div>

      {challenge.description && (
        <p className="text-vara-sm text-muted-sage-gray mb-3 line-clamp-2">{challenge.description}</p>
      )}

      <div className="flex items-center gap-vara-lg text-vara-xs text-muted-sage-gray mb-3">
        <span className="flex items-center gap-1"><Users size={14} /> {challenge.memberCount || 0}</span>
        <span className="flex items-center gap-1"><Target size={14} /> {challenge.targetCount} {challenge.unit || 'times'}</span>
        <span className="flex items-center gap-1"><Calendar size={14} /> {challenge.frequency}</span>
        {status === 'active' && <span className="flex items-center gap-1"><Clock size={14} /> {daysLeft}d left</span>}
      </div>

      {isMember && (
        <div className="flex items-center gap-2">
          <CheckCircle size={14} className="text-evergreen-teal" />
          <span className="text-vara-xs font-medium text-evergreen-teal">Joined</span>
        </div>
      )}
    </div>
  );
}

function CreateChallengeModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    challengeGoal: '',
    visibility: 'public',
    category: 'fitness',
    frequency: 'daily',
    targetCount: 21,
    unit: 'times',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.challengeGoal.trim() || !form.endDate) return;
    setSubmitting(true);
    try {
      await onCreate(form);
    } catch (err) {
      console.error('Error creating challenge:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-overlay z-50 flex items-center justify-center p-vara-base">
      <div className="bg-white rounded-vara-lg shadow-vara-lg p-vara-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-vara-lg">
          <h2 className="text-vara-lg font-semibold text-soft-charcoal">Create Challenge</h2>
          <button onClick={onClose} className="p-2 rounded-vara-md hover:bg-dew-sage-light text-muted-sage-gray">
            <span className="sr-only">Close</span>&times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-vara-base">
          <div>
            <label className="block text-vara-sm font-medium text-soft-charcoal mb-vara-xs">Challenge Name *</label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} required
              className="w-full border border-silver-sage rounded-vara-md p-vara-sm text-vara-base text-soft-charcoal focus:border-evergreen-teal focus:outline-none" />
          </div>

          <div>
            <label className="block text-vara-sm font-medium text-soft-charcoal mb-vara-xs">Goal *</label>
            <input type="text" value={form.challengeGoal} onChange={(e) => set('challengeGoal', e.target.value)} required
              placeholder="e.g., Meditate for 10 minutes"
              className="w-full border border-silver-sage rounded-vara-md p-vara-sm text-vara-base text-soft-charcoal focus:border-evergreen-teal focus:outline-none" />
          </div>

          <div>
            <label className="block text-vara-sm font-medium text-soft-charcoal mb-vara-xs">Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2}
              className="w-full border border-silver-sage rounded-vara-md p-vara-sm text-vara-base text-soft-charcoal focus:border-evergreen-teal focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-vara-base">
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-vara-xs">Category</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)}
                className="w-full border border-silver-sage rounded-vara-md p-vara-sm text-vara-base text-soft-charcoal focus:border-evergreen-teal focus:outline-none">
                {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-vara-xs">Frequency</label>
              <select value={form.frequency} onChange={(e) => set('frequency', e.target.value)}
                className="w-full border border-silver-sage rounded-vara-md p-vara-sm text-vara-base text-soft-charcoal focus:border-evergreen-teal focus:outline-none">
                {FREQUENCY_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-vara-base">
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-vara-xs">Target Count</label>
              <input type="number" min={1} value={form.targetCount} onChange={(e) => set('targetCount', parseInt(e.target.value) || 1)}
                className="w-full border border-silver-sage rounded-vara-md p-vara-sm text-vara-base text-soft-charcoal focus:border-evergreen-teal focus:outline-none" />
            </div>
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-vara-xs">Unit</label>
              <input type="text" value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="times"
                className="w-full border border-silver-sage rounded-vara-md p-vara-sm text-vara-base text-soft-charcoal focus:border-evergreen-teal focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-vara-base">
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-vara-xs">Start Date *</label>
              <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} required
                className="w-full border border-silver-sage rounded-vara-md p-vara-sm text-vara-base text-soft-charcoal focus:border-evergreen-teal focus:outline-none" />
            </div>
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-vara-xs">End Date *</label>
              <input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} required min={form.startDate}
                className="w-full border border-silver-sage rounded-vara-md p-vara-sm text-vara-base text-soft-charcoal focus:border-evergreen-teal focus:outline-none" />
            </div>
          </div>

          <div className="flex items-center gap-vara-sm">
            <input type="checkbox" id="visibility" checked={form.visibility === 'public'} onChange={(e) => set('visibility', e.target.checked ? 'public' : 'private')}
              className="w-4 h-4 rounded border-silver-sage text-evergreen-teal focus:ring-evergreen-teal" />
            <label htmlFor="visibility" className="text-vara-sm text-soft-charcoal">Public Challenge</label>
          </div>

          <div className="flex justify-end gap-vara-md pt-vara-base border-t border-divider">
            <button type="button" onClick={onClose}
              className="px-vara-base py-2 rounded-vara-md text-vara-sm border border-divider text-muted-sage-gray hover:bg-dew-sage-light">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-vara-base py-2 rounded-vara-md text-vara-sm bg-evergreen-teal text-white font-medium hover:opacity-90 disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create Challenge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
