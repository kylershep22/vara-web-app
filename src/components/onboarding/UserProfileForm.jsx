import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';

export default function UserProfileForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    maritalStatus: '',
    hasKids: '',
    city: '',
    state: '',
    country: '',
    career: '',
    careerGoals: '',
    wellnessFocus: '',
    challenge: '',
    coachingStyle: '',
    availability: '',
    healthConcerns: [],
    prefersCommunitySupport: false,
  });

  const healthOptions = ['Anxiety', 'Chronic Pain', 'Sleep Issues', 'Burnout', 'Depression', 'None'];

  const careerOptions = [
    'Teacher',
    'Nurse',
    'Software Engineer',
    'Project Manager',
    'Therapist',
    'Freelancer',
    'Marketing Specialist',
    'Customer Support',
    'Small Business Owner',
    'Personal Trainer',
    'Wellness Coach',
    'HR Specialist',
    'Administrative Assistant',
    'Medical Assistant',
    'Engineer',
    'Doctor',
    'Psychologist',
    'Sales Representative',
    'Social Worker',
    'Yoga Instructor',
    'Executive/CEO',
    'Consultant',
    'Creative Director',
    'Graphic Designer',
    'Real Estate Agent',
    'Lawyer',
    'Student',
    'Stay-at-home Parent',
    'Data Analyst',
    'Life Coach'
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'healthConcerns') {
      const updated = checked
        ? [...formData.healthConcerns, value]
        : formData.healthConcerns.filter((item) => item !== value);
      setFormData((prev) => ({ ...prev, healthConcerns: updated }));
    } else if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      if (!user) return;
      await updateDoc(doc(db, 'users', user.uid), {
        ...formData,
        onboardingComplete: true,
      });
      navigate('/onboarding/set-goal');
    } catch (err) {
      console.error('Error saving profile:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#FAFAF6] to-[#D5E3D1]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl bg-white/90 backdrop-blur-lg p-8 rounded-2xl shadow-xl"
      >
        <h2 className="text-2xl font-bold text-[#1B5E57] mb-4 text-center">
          Personalize Your Experience
        </h2>

        <p className="text-sm text-center text-[#6B7B6A] mb-6">
          This information is used only to enhance your experience with personalized
          recommendations and coaching. We will <strong>NEVER</strong> sell or share
          your data — it stays securely within Vara.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="age" type="number" placeholder="Age" value={formData.age} onChange={handleChange} className="input" />
          <select name="gender" value={formData.gender} onChange={handleChange} className="input">
            <option value="">Gender</option>
            <option>Female</option>
            <option>Male</option>
            <option>Nonbinary</option>
            <option>Prefer not to say</option>
          </select>
          <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className="input">
            <option value="">Marital Status</option>
            <option>Single</option>
            <option>Married</option>
            <option>Partnered</option>
            <option>Separated</option>
            <option>Prefer not to say</option>
          </select>
          <select name="hasKids" value={formData.hasKids} onChange={handleChange} className="input">
            <option value="">Have Kids?</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
            <option value="prefer_not">Prefer not to say</option>
          </select>
          <input name="city" type="text" placeholder="City" value={formData.city} onChange={handleChange} className="input" />
          <input name="state" type="text" placeholder="State / Province" value={formData.state} onChange={handleChange} className="input" />
          <input name="country" type="text" placeholder="Country" value={formData.country} onChange={handleChange} className="input" />

          {/* Searchable Occupation Dropdown */}
          <div className="relative w-full">
            <input
              list="careerList"
              name="career"
              value={formData.career}
              onChange={handleChange}
              className="input"
              placeholder="Occupation"
            />
            <datalist id="careerList">
              {careerOptions.map((career, i) => (
                <option key={i} value={career} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Textareas */}
        <textarea name="careerGoals" placeholder="Career Aspirations (optional)" value={formData.careerGoals} onChange={handleChange} className="input mt-4" />
        <textarea name="challenge" placeholder="Biggest Challenge Right Now?" value={formData.challenge} onChange={handleChange} className="input mt-2" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <select name="wellnessFocus" value={formData.wellnessFocus} onChange={handleChange} className="input">
            <option value="">Primary Wellness Goal</option>
            <option>Mental Health</option>
            <option>Fitness</option>
            <option>Nutrition</option>
            <option>Sleep</option>
            <option>Spirituality</option>
            <option>Focus & Productivity</option>
          </select>

          <select name="coachingStyle" value={formData.coachingStyle} onChange={handleChange} className="input">
            <option value="">Preferred Coaching Style</option>
            <option>Empathetic</option>
            <option>Motivational</option>
            <option>Data-Driven</option>
            <option>Spiritual</option>
            <option>Playful</option>
          </select>

          <select name="availability" value={formData.availability} onChange={handleChange} className="input">
            <option value="">Time Availability</option>
            <option>5-10 min/day</option>
            <option>15-30 min/day</option>
            <option>30+ min/day</option>
            <option>1-2 hours/week</option>
          </select>
        </div>

        {/* Health checkboxes */}
        <div className="mt-4">
          <p className="text-sm font-medium text-[#3E3E3E] mb-2">Any health considerations?</p>
          <div className="flex flex-wrap gap-3">
            {healthOptions.map((option) => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="healthConcerns"
                  value={option}
                  checked={formData.healthConcerns.includes(option)}
                  onChange={handleChange}
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Community toggle */}
        <div className="mt-4 flex items-center space-x-2">
          <input type="checkbox" name="prefersCommunitySupport" checked={formData.prefersCommunitySupport} onChange={handleChange} />
          <span className="text-sm">I’m interested in group/community accountability</span>
        </div>

        {/* Submit / Skip buttons */}
        <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/onboarding/set-goal')}
            className="text-[#1B5E57] underline text-sm"
          >
            Skip for now
          </button>
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#F4C542] to-[#F5B971] text-white font-semibold hover:brightness-105 transition"
          >
            Save & Continue
          </button>
        </div>
      </form>
    </div>
  );
}

