// src/pages/SetGoalFlow.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import "../../styles/custom.css"; // Ensure custom styles are loaded

const SetGoalFlow = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    focusArea: '',
    refinedFocus: '',
    goalText: '',
    timeframe: '',
  });
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (step < 6) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    setLoading(true);
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const uid = user.uid;
        const goalData = {
          ...formData,
          userId: uid,
          createdAt: serverTimestamp(),
        };

        addDoc(collection(db, 'goals'), goalData)
          .then(() => {
            console.log('Goal saved!');
            navigate('/dashboard');
          })
          .catch((error) => {
            console.error('Error saving goal:', error);
          })
          .finally(() => setLoading(false));
      } else {
        console.error('User not logged in or UID missing.');
        setLoading(false);
      }
    });
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg space-y-6 bg-gradient-to-br from-[#FAFAF6] to-[#D5E3D1]">
      <div className="text-gray-600 text-sm text-center">Step {step} of 6</div>

      {step === 1 && (
        <>
          <h2 className="text-2xl font-bold text-center text-[#1B5E57]">Choose Your Primary Focus</h2>
          <select
            name="focusArea"
            value={formData.focusArea}
            onChange={handleChange}
            className="mt-4 w-full p-3 border border-[#D5E3D1] rounded-lg bg-[#FAFAF6] focus:outline-none focus:ring-2 focus:ring-[#F4C542] focus:border-transparent"
          >
            <option value="">Select...</option>
            <option value="Physical Health & Fitness">Physical Health & Fitness</option>
            <option value="Mental & Emotional Wellness">Mental & Emotional Wellness</option>
            <option value="Lifestyle & Personal Growth">Lifestyle & Personal Growth</option>
            <option value="Sleep & Recovery">Sleep & Recovery</option>
          </select>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="text-2xl font-bold text-center text-[#1B5E57]">Refine Your Focus</h2>
          <input
            type="text"
            name="refinedFocus"
            value={formData.refinedFocus}
            onChange={handleChange}
            placeholder="E.g., Meditation, Exercise"
            className="mt-4 w-full p-3 border border-[#D5E3D1] rounded-lg bg-[#FAFAF6] focus:outline-none focus:ring-2 focus:ring-[#F4C542] focus:border-transparent"
          />
        </>
      )}

      {step === 3 && (
        <>
          <h2 className="text-2xl font-bold text-center text-[#1B5E57]">Set Your Goal</h2>
          <input
            type="text"
            name="goalText"
            value={formData.goalText}
            onChange={handleChange}
            placeholder='E.g., "Meditate 10 mins daily"'
            className="mt-4 w-full p-3 border border-[#D5E3D1] rounded-lg bg-[#FAFAF6] focus:outline-none focus:ring-2 focus:ring-[#F4C542] focus:border-transparent"
          />
        </>
      )}

      {step === 4 && (
        <>
          <h2 className="text-2xl font-bold text-center text-[#1B5E57]">Choose a Timeframe</h2>
          <select
            name="timeframe"
            value={formData.timeframe}
            onChange={handleChange}
            className="mt-4 w-full p-3 border border-[#D5E3D1] rounded-lg bg-[#FAFAF6] focus:outline-none focus:ring-2 focus:ring-[#F4C542] focus:border-transparent"
          >
            <option value="">Select timeframe...</option>
            <option value="2 weeks">2 weeks</option>
            <option value="1 month">1 month</option>
            <option value="3 months">3 months</option>
            <option value="Ongoing">Ongoing</option>
          </select>
        </>
      )}

      {step === 5 && (
        <>
          <h2 className="text-2xl font-bold text-center text-[#1B5E57]">Review Your Goal</h2>
          <ul className="mt-4 text-left text-gray-700 space-y-2">
            <li><strong>Focus:</strong> {formData.focusArea}</li>
            <li><strong>Refined Focus:</strong> {formData.refinedFocus}</li>
            <li><strong>Goal:</strong> {formData.goalText}</li>
            <li><strong>Timeframe:</strong> {formData.timeframe}</li>
          </ul>
        </>
      )}

      {step === 6 && (
        <>
          <h2 className="text-2xl font-bold text-center text-[#1B5E57]">You’re Ready to Go!</h2>
          <p className="text-center text-gray-600 mt-2">
            You’ve set your first wellness goal. Let’s start your journey!
          </p>
        </>
      )}

      <div className="flex justify-between pt-6">
        {step > 1 && (
          <button onClick={handleBack} className="px-4 py-2 text-[#1B5E57] hover:text-black font-semibold">
            Back
          </button>
        )}
        {step < 6 ? (
          <button
            onClick={handleNext}
            className="ml-auto px-6 py-2 bg-gradient-to-r from-[#F4C542] to-[#F5B971] text-white font-semibold rounded-lg hover:bg-[#F5B971] transition-all ease-in-out duration-300"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="ml-auto px-6 py-2 bg-[#1B5E57] text-white font-semibold rounded-lg hover:bg-[#144c46] transition-all ease-in-out duration-300"
          >
            {loading ? 'Saving...' : 'Finish & Save'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SetGoalFlow;






