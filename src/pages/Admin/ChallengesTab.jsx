import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trophy, Users, StopCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  createGlobalChallenge,
  listGlobalChallenges,
  updateGlobalChallenge,
  endChallenge,
  getChallengeStats,
} from "../../services/db/adminChallenges.service";

const INITIAL_FORM = {
  title: "",
  description: "",
  frequency: "daily",
  targetCount: 1,
  unit: "times",
  startDate: "",
  endDate: "",
  featured: false,
};

export default function ChallengesTab() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [statsMap, setStatsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [confirmEndId, setConfirmEndId] = useState(null);

  const loadChallenges = useCallback(async () => {
    try {
      setLoading(true);
      const list = await listGlobalChallenges();
      setChallenges(list);

      // Load stats for each challenge
      const stats = {};
      await Promise.all(
        list.map(async (c) => {
          try {
            stats[c.id] = await getChallengeStats(c.id);
          } catch {
            stats[c.id] = {
              totalParticipants: c.memberCount || 0,
              activeParticipants: 0,
              totalCheckIns: 0,
            };
          }
        })
      );
      setStatsMap(stats);
    } catch (err) {
      if (process.env.NODE_ENV === "development")
        console.error("Failed to load challenges:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || submitting) return;

    try {
      setSubmitting(true);
      await createGlobalChallenge(user.uid, {
        title: form.title.trim(),
        description: form.description.trim(),
        frequency: form.frequency,
        targetCount: Number(form.targetCount),
        unit: form.unit.trim() || "times",
        startDate: form.startDate,
        endDate: form.endDate,
        featured: form.featured,
      });
      setForm(INITIAL_FORM);
      setShowForm(false);
      await loadChallenges();
    } catch (err) {
      if (process.env.NODE_ENV === "development")
        console.error("Failed to create challenge:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFeatured = async (challenge) => {
    try {
      await updateGlobalChallenge(challenge.id, {
        featured: !challenge.featured,
      });
      await loadChallenges();
    } catch (err) {
      if (process.env.NODE_ENV === "development")
        console.error("Failed to toggle featured:", err);
    }
  };

  const handleEnd = async (challengeId) => {
    try {
      await endChallenge(challengeId);
      setConfirmEndId(null);
      await loadChallenges();
    } catch (err) {
      if (process.env.NODE_ENV === "development")
        console.error("Failed to end challenge:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-evergreen-teal/30 border-t-evergreen-teal rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-vara-base">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-vara-lg font-semibold text-soft-charcoal">
          Global Challenges
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-vara-sm py-2 bg-evergreen-teal text-white rounded-lg text-vara-sm font-medium hover:bg-evergreen-teal/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Challenge
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-divider p-vara-base space-y-vara-sm"
        >
          <h3 className="text-vara-base font-semibold text-soft-charcoal">
            New Global Challenge
          </h3>

          <div>
            <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">
              Title
            </label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-divider rounded-lg text-vara-sm focus:outline-none focus:ring-2 focus:ring-evergreen-teal/30"
              placeholder="e.g. 30-Day Mindfulness Challenge"
            />
          </div>

          <div>
            <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-divider rounded-lg text-vara-sm focus:outline-none focus:ring-2 focus:ring-evergreen-teal/30 resize-none"
              placeholder="Describe what participants will do..."
            />
          </div>

          <div className="grid grid-cols-2 gap-vara-sm">
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">
                Frequency
              </label>
              <select
                name="frequency"
                value={form.frequency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-divider rounded-lg text-vara-sm focus:outline-none focus:ring-2 focus:ring-evergreen-teal/30"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">
                  Target
                </label>
                <input
                  name="targetCount"
                  type="number"
                  min="1"
                  value={form.targetCount}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-divider rounded-lg text-vara-sm focus:outline-none focus:ring-2 focus:ring-evergreen-teal/30"
                />
              </div>
              <div>
                <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">
                  Unit
                </label>
                <input
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-divider rounded-lg text-vara-sm focus:outline-none focus:ring-2 focus:ring-evergreen-teal/30"
                  placeholder="times"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-vara-sm">
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">
                Start Date
              </label>
              <input
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-divider rounded-lg text-vara-sm focus:outline-none focus:ring-2 focus:ring-evergreen-teal/30"
              />
            </div>
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">
                End Date
              </label>
              <input
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-divider rounded-lg text-vara-sm focus:outline-none focus:ring-2 focus:ring-evergreen-teal/30"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              name="featured"
              type="checkbox"
              checked={form.featured}
              onChange={handleChange}
              className="w-4 h-4 rounded border-divider text-evergreen-teal focus:ring-evergreen-teal/30"
            />
            <span className="text-vara-sm text-soft-charcoal">
              Featured challenge
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-vara-base py-2 bg-evergreen-teal text-white rounded-lg text-vara-sm font-medium hover:bg-evergreen-teal/90 transition-colors disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Challenge"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(INITIAL_FORM);
              }}
              className="px-vara-base py-2 border border-divider text-muted-sage-gray rounded-lg text-vara-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Challenges List */}
      {challenges.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-sage-gray">
          <Trophy className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-vara-base font-medium">No global challenges yet</p>
          <p className="text-vara-sm">
            Create your first challenge to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map((challenge) => {
            const stats = statsMap[challenge.id] || {};
            const isEnded = challenge.status === "ended";

            return (
              <div
                key={challenge.id}
                className="bg-white rounded-xl border border-divider p-vara-base"
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-vara-base font-semibold text-soft-charcoal">
                      {challenge.title}
                    </h3>
                    {challenge.featured && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        Featured
                      </span>
                    )}
                    {isEnded && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                        Ended
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                {challenge.description && (
                  <p className="text-vara-sm text-muted-sage-gray mt-1 line-clamp-2">
                    {challenge.description}
                  </p>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-4 mt-3 text-vara-sm text-muted-sage-gray">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {stats.totalParticipants ?? 0} participants
                  </span>
                  <span>{stats.activeParticipants ?? 0} active</span>
                  <span>{stats.totalCheckIns ?? 0} check-ins</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleToggleFeatured(challenge)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      challenge.featured
                        ? "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                        : "border-divider text-muted-sage-gray hover:bg-gray-50"
                    }`}
                  >
                    {challenge.featured ? "Unfeature" : "Feature"}
                  </button>

                  {!isEnded && (
                    <>
                      {confirmEndId === challenge.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600">
                            End this challenge?
                          </span>
                          <button
                            onClick={() => handleEnd(challenge.id)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmEndId(null)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-divider text-muted-sage-gray hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmEndId(challenge.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <StopCircle className="w-3.5 h-3.5" />
                          End
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
