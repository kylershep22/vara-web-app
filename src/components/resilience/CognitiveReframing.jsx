// src/components/resilience/CognitiveReframing.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { Brain, Lightbulb, ArrowRight, BookOpen } from 'lucide-react';

const CognitiveReframing = ({ userId }) => {
  const [reframes, setReframes] = useState([]);
  const [situation, setSituation] = useState('');
  const [automaticThought, setAutomaticThought] = useState('');
  const [evidence, setEvidence] = useState('');
  const [alternative, setAlternative] = useState('');
  const [selectedDistortion, setSelectedDistortion] = useState(null);
  const [loading, setLoading] = useState(true);

  const cognitiveDistortions = [
    {
      id: 'all-or-nothing',
      name: 'All-or-Nothing Thinking',
      description: 'Seeing things in black-and-white categories (perfect or failure)',
      example: '"If I\'m not perfect, I\'m a total failure"',
      reframe: 'Look for the gray area. Most things exist on a spectrum.'
    },
    {
      id: 'overgeneralization',
      name: 'Overgeneralization',
      description: 'Viewing a single negative event as a never-ending pattern',
      example: '"I failed once, so I always fail"',
      reframe: 'One event doesn\'t define a pattern. Look for counter-examples.'
    },
    {
      id: 'mental-filter',
      name: 'Mental Filter',
      description: 'Focusing exclusively on negatives while filtering out positives',
      example: 'Dwelling on one criticism despite multiple compliments',
      reframe: 'Zoom out. What\'s the full picture, including the positives?'
    },
    {
      id: 'catastrophizing',
      name: 'Catastrophizing',
      description: 'Expecting the worst possible outcome',
      example: '"If I make one mistake, everything will fall apart"',
      reframe: 'What\'s the most likely outcome? What evidence supports catastrophe?'
    },
    {
      id: 'personalization',
      name: 'Personalization',
      description: 'Taking responsibility for things outside your control',
      example: '"They seemed upset, it must be my fault"',
      reframe: 'What factors are outside my control? What\'s my actual responsibility?'
    },
    {
      id: 'should-statements',
      name: 'Should Statements',
      description: 'Rigid rules about how you or others "should" behave',
      example: '"I should always be productive" or "They should know better"',
      reframe: 'Replace "should" with "prefer" or "could". Soften the rigidity.'
    },
    {
      id: 'emotional-reasoning',
      name: 'Emotional Reasoning',
      description: 'Assuming feelings reflect reality',
      example: '"I feel anxious, so something bad will happen"',
      reframe: 'Feelings aren\'t facts. What does the evidence actually show?'
    },
    {
      id: 'labeling',
      name: 'Labeling',
      description: 'Assigning global negative labels to yourself or others',
      example: '"I\'m a loser" instead of "I made a mistake"',
      reframe: 'Describe the behavior, not the person. Specificity over labels.'
    }
  ];

  useEffect(() => {
    if (userId) {
      fetchReframes();
    }
  }, [userId]);

  const fetchReframes = async () => {
    setLoading(true);
    try {
      const reframesQuery = query(
        collection(db, 'cognitiveReframes'),
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(reframesQuery);
      const reframesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setReframes(reframesData);
    } catch (error) {
      console.error('Error fetching cognitive reframes:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveReframe = async () => {
    if (!userId || !situation || !automaticThought || !alternative) return;

    try {
      await addDoc(collection(db, 'cognitiveReframes'), {
        userId,
        situation: situation.trim(),
        automaticThought: automaticThought.trim(),
        evidence: evidence.trim(),
        alternative: alternative.trim(),
        distortion: selectedDistortion?.id || null,
        distortionName: selectedDistortion?.name || null,
        date: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      setSituation('');
      setAutomaticThought('');
      setEvidence('');
      setAlternative('');
      setSelectedDistortion(null);
      fetchReframes();
    } catch (error) {
      console.error('Error saving cognitive reframe:', error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
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
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <Brain className="text-indigo-600" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-indigo-900 mb-2">Cognitive Reframing</h2>
            <p className="text-indigo-700 mb-2">
              Cognitive reframing is a core CBT technique for challenging and changing unhelpful thought patterns.
              By questioning automatic thoughts, you can reduce anxiety, improve mood, and build resilience.
            </p>
            <p className="text-sm text-indigo-600">
              When you notice a stressful thought, use this tool to examine the evidence and generate more balanced perspectives.
            </p>
          </div>
        </div>
      </div>

      {/* Common Cognitive Distortions */}
      <div className="bg-white rounded-xl border border-divider p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="text-muted-sage-gray" size={20} />
          <h3 className="text-lg font-semibold text-soft-charcoal">Common Cognitive Distortions</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cognitiveDistortions.map(distortion => (
            <div
              key={distortion.id}
              onClick={() => setSelectedDistortion(selectedDistortion?.id === distortion.id ? null : distortion)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                selectedDistortion?.id === distortion.id
                  ? 'border-evergreen-teal bg-teal-light'
                  : 'border-divider hover:border-divider'
              }`}
            >
              <h4 className="font-semibold text-soft-charcoal mb-1">{distortion.name}</h4>
              <p className="text-sm text-muted-sage-gray mb-2">{distortion.description}</p>
              <div className="text-xs text-muted-sage-gray italic mb-2">Example: {distortion.example}</div>
              {selectedDistortion?.id === distortion.id && (
                <div className="mt-2 p-2 bg-white rounded border border-silver-sage">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="text-evergreen-teal mt-0.5 flex-shrink-0" size={14} />
                    <p className="text-xs text-evergreen-teal"><strong>Reframe:</strong> {distortion.reframe}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-sage-gray mt-4">Click a distortion to see reframing strategies.</p>
      </div>

      {/* Thought Record */}
      <div className="bg-white rounded-xl border border-divider p-6">
        <h3 className="text-lg font-semibold text-soft-charcoal mb-4">Thought Record</h3>
        <p className="text-sm text-muted-sage-gray mb-4">
          Walk through these steps to challenge an unhelpful thought and generate a more balanced alternative.
        </p>

        <div className="space-y-4">
          {/* Step 1: Situation */}
          <div>
            <label className="block text-sm font-semibold text-soft-charcoal mb-2">
              1. What was the situation?
            </label>
            <input
              type="text"
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="Describe the event or trigger..."
              className="w-full px-4 py-3 border border-divider rounded-lg focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
            />
          </div>

          {/* Step 2: Automatic Thought */}
          <div>
            <label className="block text-sm font-semibold text-soft-charcoal mb-2">
              2. What automatic thought came up?
            </label>
            <textarea
              value={automaticThought}
              onChange={(e) => setAutomaticThought(e.target.value)}
              rows="2"
              placeholder="What went through your mind? What did you tell yourself?"
              className="w-full px-4 py-3 border border-divider rounded-lg focus:ring-2 focus:ring-evergreen-teal focus:border-transparent resize-none"
            />
          </div>

          {/* Optional: Distortion */}
          {selectedDistortion && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Brain className="text-purple-600 mt-0.5" size={16} />
                <div>
                  <p className="text-sm font-semibold text-purple-900">Identified Distortion:</p>
                  <p className="text-sm text-purple-700">{selectedDistortion.name}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Evidence */}
          <div>
            <label className="block text-sm font-semibold text-soft-charcoal mb-2">
              3. What evidence supports or contradicts this thought?
            </label>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              rows="3"
              placeholder="What are the facts? What would you tell a friend in this situation?"
              className="w-full px-4 py-3 border border-divider rounded-lg focus:ring-2 focus:ring-evergreen-teal focus:border-transparent resize-none"
            />
          </div>

          {/* Step 4: Alternative Thought */}
          <div>
            <label className="block text-sm font-semibold text-soft-charcoal mb-2">
              4. What's a more balanced or realistic thought?
            </label>
            <textarea
              value={alternative}
              onChange={(e) => setAlternative(e.target.value)}
              rows="3"
              placeholder="Based on the evidence, what's a more helpful way to think about this?"
              className="w-full px-4 py-3 border border-divider rounded-lg focus:ring-2 focus:ring-evergreen-teal focus:border-transparent resize-none"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={saveReframe}
            disabled={!situation || !automaticThought || !alternative}
            className={`w-full px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
              !situation || !automaticThought || !alternative
                ? 'bg-silver-sage/30 text-muted-sage-gray cursor-not-allowed'
                : 'bg-evergreen-teal text-white hover:opacity-90'
            }`}
          >
            <ArrowRight size={20} />
            Save Reframe
          </button>
        </div>
      </div>

      {/* Past Reframes */}
      <div className="bg-white rounded-xl border border-divider p-6">
        <h3 className="text-lg font-semibold text-soft-charcoal mb-4">Past Reframes</h3>

        {reframes.length > 0 ? (
          <div className="space-y-4">
            {reframes.map(reframe => (
              <div key={reframe.id} className="p-4 bg-dew-sage-light rounded-lg border border-divider">
                <div className="text-sm text-muted-sage-gray mb-3">{formatDate(reframe.date)}</div>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-muted-sage-gray uppercase mb-1">Situation</div>
                    <p className="text-sm text-soft-charcoal">{reframe.situation}</p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-red-600 uppercase mb-1">Automatic Thought</div>
                      <p className="text-sm text-soft-charcoal italic">{reframe.automaticThought}</p>
                    </div>
                    <ArrowRight className="text-muted-sage-gray/60 mt-4" size={20} />
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-evergreen-teal uppercase mb-1">Alternative Thought</div>
                      <p className="text-sm text-soft-charcoal font-medium">{reframe.alternative}</p>
                    </div>
                  </div>

                  {reframe.evidence && (
                    <div>
                      <div className="text-xs font-semibold text-muted-sage-gray uppercase mb-1">Evidence</div>
                      <p className="text-sm text-soft-charcoal">{reframe.evidence}</p>
                    </div>
                  )}

                  {reframe.distortionName && (
                    <div className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      {reframe.distortionName}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-sage-gray">
            <Brain className="mx-auto mb-2 text-muted-sage-gray/60" size={48} />
            <p>No reframes yet. Start challenging unhelpful thoughts today!</p>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900 mb-2">Tips for Effective Reframing</h3>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Practice regularly: The more you reframe, the more automatic it becomes</li>
          <li>• Be specific: Vague thoughts are hard to challenge</li>
          <li>• Look for evidence: Base alternatives on facts, not just positive thinking</li>
          <li>• Aim for balance: Not overly negative OR overly positive</li>
          <li>• Be patient: Changing thought patterns takes time and repetition</li>
        </ul>
      </div>
    </div>
  );
};

export default CognitiveReframing;
