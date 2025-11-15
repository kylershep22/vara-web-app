// src/components/insights/WheelOfLife.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { Circle, TrendingUp, Calendar, Lightbulb, Plus, History } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const WheelOfLife = ({ userId }) => {
  const [assessments, setAssessments] = useState([]);
  const [currentRatings, setCurrentRatings] = useState({
    careerPurpose: 5,
    healthVitality: 5,
    relationshipsLove: 5,
    personalGrowth: 5,
    financeSecurity: 5,
    recreationJoy: 5,
    environmentSpace: 5,
    contributionLegacy: 5
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  const categories = [
    {
      key: 'careerPurpose',
      label: 'Career & Purpose',
      description: 'Work satisfaction, meaning, and professional growth',
      color: '#8B5CF6'
    },
    {
      key: 'healthVitality',
      label: 'Health & Vitality',
      description: 'Physical health, energy, and fitness',
      color: '#10B981'
    },
    {
      key: 'relationshipsLove',
      label: 'Relationships & Love',
      description: 'Quality of connections with family, friends, partner',
      color: '#F59E0B'
    },
    {
      key: 'personalGrowth',
      label: 'Personal Growth',
      description: 'Learning, development, and self-improvement',
      color: '#3B82F6'
    },
    {
      key: 'financeSecurity',
      label: 'Finance & Security',
      description: 'Financial stability, savings, and future planning',
      color: '#EC4899'
    },
    {
      key: 'recreationJoy',
      label: 'Recreation & Joy',
      description: 'Hobbies, fun, relaxation, and play',
      color: '#F97316'
    },
    {
      key: 'environmentSpace',
      label: 'Environment & Space',
      description: 'Living space, organization, and surroundings',
      color: '#06B6D4'
    },
    {
      key: 'contributionLegacy',
      label: 'Contribution & Legacy',
      description: 'Impact on others, community involvement, purpose',
      color: '#6366F1'
    }
  ];

  useEffect(() => {
    if (userId) {
      fetchAssessments();
    }
  }, [userId]);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const assessmentsQuery = query(
        collection(db, 'wheelOfLife'),
        where('userId', '==', userId),
        orderBy('assessmentDate', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(assessmentsQuery);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setAssessments(data);

      // If there's a recent assessment (within 30 days), don't show form by default
      if (data.length > 0) {
        const latestDate = data[0].assessmentDate?.toDate ? data[0].assessmentDate.toDate() : new Date(data[0].assessmentDate);
        const daysSince = Math.floor((new Date() - latestDate) / (1000 * 60 * 60 * 24));
        setShowForm(daysSince > 30);
      } else {
        setShowForm(true);
      }
    } catch (error) {
      console.error('Error fetching wheel of life assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveAssessment = async () => {
    if (!userId) return;

    try {
      await addDoc(collection(db, 'wheelOfLife'), {
        userId,
        assessmentDate: serverTimestamp(),
        ratings: currentRatings,
        notes: notes.trim(),
        createdAt: serverTimestamp()
      });

      // Reset form
      setCurrentRatings({
        careerPurpose: 5,
        healthVitality: 5,
        relationshipsLove: 5,
        personalGrowth: 5,
        financeSecurity: 5,
        recreationJoy: 5,
        environmentSpace: 5,
        contributionLegacy: 5
      });
      setNotes('');
      setShowForm(false);
      fetchAssessments();
    } catch (error) {
      console.error('Error saving wheel of life assessment:', error);
    }
  };

  const getChartData = (ratings) => {
    return categories.map(cat => ({
      category: cat.label.split(' & ')[0], // Shorten for chart
      value: ratings[cat.key],
      fullMark: 10
    }));
  };

  const calculateAverage = (ratings) => {
    const values = Object.values(ratings);
    return (values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(1);
  };

  const getLowestCategories = (ratings) => {
    return categories
      .map(cat => ({ ...cat, rating: ratings[cat.key] }))
      .sort((a, b) => a.rating - b.rating)
      .slice(0, 3);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-100 h-64 rounded-lg"></div>
        ))}
      </div>
    );
  }

  const latestAssessment = assessments[0];

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Circle className="text-purple-600" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-purple-900 mb-2">Wheel of Life Assessment</h2>
            <p className="text-purple-700 mb-2">
              The Wheel of Life is a powerful tool for visualizing balance across 8 key life areas.
              Rate each category from 0 (not satisfied) to 10 (completely satisfied) to identify where to focus your energy.
            </p>
            <p className="text-sm text-purple-600">
              We recommend reassessing quarterly to track progress and maintain balance.
            </p>
          </div>
        </div>
      </div>

      {/* Latest Assessment / Chart */}
      {latestAssessment && !showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Current Life Balance</h3>
              <p className="text-sm text-gray-500">Assessed on {formatDate(latestAssessment.assessmentDate)}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCompareMode(!compareMode)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
              >
                <History size={16} />
                {compareMode ? 'Hide History' : 'Compare'}
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-[#1B5E57] text-white rounded-lg hover:bg-[#174C46] transition flex items-center gap-2"
              >
                <Plus size={16} />
                New Assessment
              </button>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="mb-6">
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={getChartData(latestAssessment.ratings)}>
                <PolarGrid />
                <PolarAngleAxis dataKey="category" />
                <PolarRadiusAxis angle={90} domain={[0, 10]} />
                <Radar
                  name="Current"
                  dataKey="value"
                  stroke="#8B5CF6"
                  fill="#8B5CF6"
                  fillOpacity={0.6}
                />
                {compareMode && assessments[1] && (
                  <Radar
                    name="Previous"
                    dataKey="value"
                    data={getChartData(assessments[1].ratings)}
                    stroke="#94A3B8"
                    fill="#94A3B8"
                    fillOpacity={0.3}
                  />
                )}
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-purple-600 mb-1">Overall Balance</div>
              <div className="text-3xl font-bold text-purple-900">
                {calculateAverage(latestAssessment.ratings)}/10
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600 mb-1">Highest Score</div>
              <div className="text-lg font-semibold text-green-900">
                {categories.reduce((max, cat) =>
                  latestAssessment.ratings[cat.key] > latestAssessment.ratings[max.key] ? cat : max
                , categories[0]).label}
              </div>
              <div className="text-2xl font-bold text-green-900">
                {Math.max(...Object.values(latestAssessment.ratings))}/10
              </div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="text-sm text-orange-600 mb-1">Needs Attention</div>
              <div className="text-lg font-semibold text-orange-900">
                {getLowestCategories(latestAssessment.ratings)[0].label}
              </div>
              <div className="text-2xl font-bold text-orange-900">
                {Math.min(...Object.values(latestAssessment.ratings))}/10
              </div>
            </div>
          </div>

          {/* Notes */}
          {latestAssessment.notes && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-semibold text-gray-700 mb-2">Your Notes</div>
              <p className="text-gray-900">{latestAssessment.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Assessment Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Rate Your Life Balance</h3>
            {latestAssessment && (
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-6">
            For each area, rate your current level of satisfaction from 0 (not satisfied) to 10 (completely satisfied).
          </p>

          <div className="space-y-6">
            {categories.map(category => (
              <div key={category.key}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold text-gray-900">{category.label}</div>
                    <div className="text-sm text-gray-600">{category.description}</div>
                  </div>
                  <div className="text-2xl font-bold text-[#1B5E57] min-w-[50px] text-right">
                    {currentRatings[category.key]}
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={currentRatings[category.key]}
                  onChange={(e) => setCurrentRatings({
                    ...currentRatings,
                    [category.key]: parseInt(e.target.value)
                  })}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${category.color} 0%, ${category.color} ${currentRatings[category.key] * 10}%, #E5E7EB ${currentRatings[category.key] * 10}%, #E5E7EB 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Not Satisfied</span>
                  <span>Completely Satisfied</span>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
              placeholder="Any observations, goals, or reflections about your current life balance..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B5E57] focus:border-transparent resize-none"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={saveAssessment}
            className="mt-6 w-full px-6 py-3 bg-[#1B5E57] text-white rounded-lg font-semibold hover:bg-[#174C46] transition flex items-center justify-center gap-2"
          >
            <Circle size={20} />
            Save Assessment
          </button>
        </div>
      )}

      {/* Insights & Recommendations */}
      {latestAssessment && !showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="text-yellow-500" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Insights & Recommendations</h3>
          </div>

          <div className="space-y-4">
            {/* Areas to Focus */}
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-semibold text-orange-900 mb-2">Areas Needing Attention</h4>
              <ul className="space-y-2">
                {getLowestCategories(latestAssessment.ratings).map(cat => (
                  <li key={cat.key} className="flex items-start gap-2">
                    <TrendingUp className="text-orange-600 mt-0.5 flex-shrink-0" size={16} />
                    <div>
                      <span className="font-medium text-gray-900">{cat.label}</span>
                      <span className="text-orange-700"> (Score: {cat.rating}/10)</span>
                      <p className="text-sm text-gray-600">{cat.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Balance Check */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Balance Insights</h4>
              <div className="text-sm text-blue-700 space-y-2">
                {Math.max(...Object.values(latestAssessment.ratings)) - Math.min(...Object.values(latestAssessment.ratings)) > 5 ? (
                  <p>⚠️ You have significant imbalance (range: {Math.min(...Object.values(latestAssessment.ratings))}-{Math.max(...Object.values(latestAssessment.ratings))}). Consider small improvements in lower-scoring areas.</p>
                ) : (
                  <p>✓ Your life areas are relatively balanced. Keep nurturing all dimensions.</p>
                )}
                {calculateAverage(latestAssessment.ratings) < 5 && (
                  <p>💡 Your overall satisfaction is below 5. Consider setting one small goal in your lowest-scoring area.</p>
                )}
                {calculateAverage(latestAssessment.ratings) >= 7 && (
                  <p>🎉 Strong overall life satisfaction! Focus on maintaining this balance.</p>
                )}
              </div>
            </div>

            {/* Action Items */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Suggested Action Steps</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Create a goal related to your lowest-scoring category</li>
                <li>• Schedule time this week for your top priority area</li>
                <li>• Reflect on what would move your score up by just 1 point</li>
                <li>• Consider if any high scores require maintenance to prevent decline</li>
                <li>• Reassess in 30-90 days to track progress</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Assessment History */}
      {assessments.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-gray-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Assessment History</h3>
          </div>

          <div className="space-y-3">
            {assessments.map((assessment, idx) => (
              <div key={assessment.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {formatDate(assessment.assessmentDate)}
                  </span>
                  <span className="text-lg font-bold text-[#1B5E57]">
                    {calculateAverage(assessment.ratings)}/10
                  </span>
                </div>
                {idx > 0 && (
                  <div className="text-sm text-gray-600">
                    Change from previous: {(calculateAverage(assessment.ratings) - calculateAverage(assessments[idx - 1].ratings)).toFixed(1)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WheelOfLife;
