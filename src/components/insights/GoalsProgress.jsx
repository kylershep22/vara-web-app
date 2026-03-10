// src/components/insights/GoalsProgress.jsx

import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Target, CheckCircle, Clock, TrendingUp, Award, Calendar } from 'lucide-react';

const GoalsProgress = ({ userId }) => {
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    completionRate: 0
  });
  const [groupedGoals, setGroupedGoals] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchGoalsData();
    }
  }, [userId]);

  const fetchGoalsData = async () => {
    setLoading(true);
    try {
      const goalsQuery = query(
        collection(db, 'goals'),
        where('userId', '==', userId)
      );
      const goalsSnapshot = await getDocs(goalsQuery);
      const goalsData = goalsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setGoals(goalsData);

      // Calculate stats
      const total = goalsData.length;
      const completed = goalsData.filter(g => g.status === 'completed').length;
      const active = goalsData.filter(g => g.status !== 'completed').length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      setStats({ total, active, completed, completionRate });

      // Group by primaryFocus
      const grouped = {};
      goalsData.forEach(goal => {
        const focus = goal.primaryFocus || 'Other';
        if (!grouped[focus]) {
          grouped[focus] = [];
        }
        grouped[focus].push(goal);
      });

      setGroupedGoals(grouped);
    } catch (error) {
      console.error('Error fetching goals data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'from-evergreen-teal to-evergreen-teal';
    if (progress >= 60) return 'from-blue-500 to-cyan-500';
    if (progress >= 40) return 'from-yellow-500 to-orange-500';
    return 'from-orange-500 to-red-500';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 bg-dew-sage text-evergreen-teal text-xs font-medium rounded-full">Completed</span>;
      case 'in-progress':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">In Progress</span>;
      default:
        return <span className="px-2 py-1 bg-dew-sage-light text-soft-charcoal text-xs font-medium rounded-full">Not Started</span>;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'No date set';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-dew-sage-light h-32 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-blue-600" size={20} />
            <span className="text-xs font-medium text-blue-700 uppercase">Total Goals</span>
          </div>
          <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
        </div>

        <div className="bg-gradient-to-br from-teal-light to-dew-sage rounded-lg p-4 border border-silver-sage">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-evergreen-teal" size={20} />
            <span className="text-xs font-medium text-evergreen-teal uppercase">Completed</span>
          </div>
          <div className="text-3xl font-bold text-evergreen-teal">{stats.completed}</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="text-orange-600" size={20} />
            <span className="text-xs font-medium text-orange-700 uppercase">Active</span>
          </div>
          <div className="text-3xl font-bold text-orange-900">{stats.active}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Award className="text-purple-600" size={20} />
            <span className="text-xs font-medium text-purple-700 uppercase">Completion Rate</span>
          </div>
          <div className="text-3xl font-bold text-purple-900">{stats.completionRate}%</div>
        </div>
      </div>

      {/* Goals by Focus Area */}
      <div className="bg-white rounded-xl border border-divider p-6">
        <h3 className="text-lg font-semibold text-soft-charcoal mb-4">Goals by Focus Area</h3>

        {Object.keys(groupedGoals).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedGoals).map(([focus, focusGoals]) => {
              const completed = focusGoals.filter(g => g.status === 'completed').length;
              const focusCompletionRate = Math.round((completed / focusGoals.length) * 100);

              return (
                <div key={focus} className="border border-divider rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-soft-charcoal capitalize">{focus}</h4>
                    <div className="text-sm text-muted-sage-gray">
                      {completed} of {focusGoals.length} completed ({focusCompletionRate}%)
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-silver-sage/30 rounded-full h-2 mb-4">
                    <div
                      className={`h-2 rounded-full bg-gradient-to-r ${getProgressColor(focusCompletionRate)}`}
                      style={{ width: `${focusCompletionRate}%` }}
                    ></div>
                  </div>

                  {/* Goals in this focus area */}
                  <div className="space-y-2">
                    {focusGoals.map(goal => (
                      <div key={goal.id} className="flex items-center justify-between p-2 bg-dew-sage-light rounded">
                        <div className="flex-1">
                          <div className="font-medium text-soft-charcoal">{goal.title}</div>
                          {goal.refinedFocus && (
                            <div className="text-xs text-muted-sage-gray">{goal.refinedFocus}</div>
                          )}
                        </div>
                        {getStatusBadge(goal.status)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-sage-gray">
            <Target className="mx-auto mb-2 text-muted-sage-gray/60" size={48} />
            <p>No goals yet. Create your first goal to start tracking progress!</p>
          </div>
        )}
      </div>

      {/* Active Goals Timeline */}
      {stats.active > 0 && (
        <div className="bg-white rounded-xl border border-divider p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-muted-sage-gray" size={20} />
            <h3 className="text-lg font-semibold text-soft-charcoal">Active Goals</h3>
          </div>

          <div className="space-y-4">
            {goals
              .filter(g => g.status !== 'completed')
              .map(goal => {
                const progress = goal.progress || 0;

                return (
                  <div key={goal.id} className="border border-divider rounded-lg p-4 hover:border-evergreen-teal transition">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-soft-charcoal mb-1">{goal.title}</h4>
                        <div className="text-sm text-muted-sage-gray">{goal.refinedFocus || goal.primaryFocus}</div>
                      </div>
                      <div className="text-2xl font-bold text-soft-charcoal">{progress}%</div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-silver-sage/30 rounded-full h-3 mb-2">
                      <div
                        className={`h-3 rounded-full bg-gradient-to-r ${getProgressColor(progress)} transition-all`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-sage-gray">
                      <div>Timeframe: {goal.timeframe || 'Not set'}</div>
                      <div>Created: {formatDate(goal.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {stats.completed > 0 && (
        <div className="bg-white rounded-xl border border-divider p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="text-yellow-600" size={20} />
            <h3 className="text-lg font-semibold text-soft-charcoal">Completed Goals</h3>
          </div>

          <div className="space-y-2">
            {goals
              .filter(g => g.status === 'completed')
              .map(goal => (
                <div key={goal.id} className="flex items-center justify-between p-3 bg-teal-light border border-silver-sage rounded-lg">
                  <div>
                    <div className="font-medium text-soft-charcoal">{goal.title}</div>
                    <div className="text-xs text-muted-sage-gray">{goal.refinedFocus || goal.primaryFocus}</div>
                  </div>
                  <CheckCircle className="text-evergreen-teal" size={20} />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {stats.total > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
          <h3 className="font-semibold text-indigo-900 mb-3">Goal Insights</h3>
          <div className="space-y-2 text-sm text-indigo-700">
            <p>
              • You have <strong>{stats.active}</strong> active goals. Focus on making progress on 1-3 goals at a time for best results.
            </p>
            <p>
              • Your completion rate is <strong>{stats.completionRate}%</strong>.
              {stats.completionRate >= 70 && ' Excellent work staying committed to your goals!'}
              {stats.completionRate < 70 && stats.completionRate >= 40 && ' Consider breaking goals into smaller milestones.'}
              {stats.completionRate < 40 && ' Try focusing on fewer goals or adjusting your timeframes.'}
            </p>
            {Object.keys(groupedGoals).length > 0 && (
              <p>
                • Your top focus area is <strong className="capitalize">{Object.keys(groupedGoals)[0]}</strong> with {groupedGoals[Object.keys(groupedGoals)[0]].length} goals.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsProgress;
