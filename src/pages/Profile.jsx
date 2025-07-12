// src/pages/Profile.jsx

import React, { useState, useEffect, useRef } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { User, Bell, Settings, CreditCard, Sparkles, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function Profile() {
  const { user } = useAuth();
  const fileInputRef = useRef();
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    tone: 'gentle',
    reminderTime: '08:00',
    intensity: 'standard',
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
    avatarUrl: '',
    notificationsEnabled: true,
    aiPreferences: 'standard',
    subscriptionPlan: 'Free',
    renewalDate: '',
    billingInfo: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setFormData(prev => ({
          ...prev,
          ...data,
          name: data.name || data.displayName || ''
        }));
      }
    };
    fetchData();
  }, [user]);

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

  const handleSave = async () => {
    const ref = doc(db, 'users', user.uid);
    await updateDoc(ref, { ...formData });
    alert('Profile updated!');
  };

  const handleAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, avatarUrl: url }));
  };

  const healthOptions = ['Anxiety', 'Chronic Pain', 'Sleep Issues', 'Burnout', 'Depression', 'None'];
  const careerOptions = [
    'Teacher', 'Nurse', 'Software Engineer', 'Project Manager', 'Therapist', 'Freelancer',
    'Marketing Specialist', 'Customer Support', 'Small Business Owner', 'Personal Trainer',
    'Wellness Coach', 'HR Specialist', 'Administrative Assistant', 'Medical Assistant',
    'Engineer', 'Doctor', 'Psychologist', 'Sales Representative', 'Social Worker', 'Yoga Instructor',
    'Executive/CEO', 'Consultant', 'Creative Director', 'Graphic Designer', 'Real Estate Agent',
    'Lawyer', 'Student', 'Stay-at-home Parent', 'Data Analyst', 'Life Coach'
  ];

  return (
    <SidebarLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-12">
        {/* Avatar Upload */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <img
              src={formData.avatarUrl || '/placeholder-avatar.png'}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover border-2 border-[#D5E3D1]"
            />
            <button
              onClick={handleAvatarUpload}
              className="absolute bottom-0 right-0 bg-[#1B5E57] p-1.5 rounded-full text-white hover:bg-emerald-800"
            >
              <Camera size={16} />
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        {/* Account Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <User size={28} className="text-[#1B5E57]" />
            <h2 className="text-xl font-semibold text-[#3E3E3E]">Account Info</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="name" placeholder="Name" value={formData.name} onChange={handleChange} className="input" />
            <input type="number" name="age" placeholder="Age" value={formData.age} onChange={handleChange} className="input" />
            <input name="city" placeholder="City" value={formData.city} onChange={handleChange} className="input" />
            <input name="state" placeholder="State" value={formData.state} onChange={handleChange} className="input" />
            <input name="country" placeholder="Country" value={formData.country} onChange={handleChange} className="input" />
          </div>
        </section>

        {/* Preferences Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Bell size={24} className="text-[#1B5E57]" />
            <h2 className="text-xl font-semibold text-[#3E3E3E]">Preferences</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="time" name="reminderTime" value={formData.reminderTime} onChange={handleChange} className="input" />
            <select name="tone" value={formData.tone} onChange={handleChange} className="input">
              <option value="gentle">Gentle</option>
              <option value="encouraging">Encouraging</option>
              <option value="direct">Direct</option>
            </select>
            <select name="intensity" value={formData.intensity} onChange={handleChange} className="input">
              <option value="low">Low</option>
              <option value="standard">Standard</option>
              <option value="high">High</option>
            </select>
            <select name="aiPreferences" value={formData.aiPreferences} onChange={handleChange} className="input">
              <option value="standard">Standard</option>
              <option value="wellness-focused">Wellness-Focused</option>
              <option value="coach-like">Coach-like</option>
            </select>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="notificationsEnabled" checked={formData.notificationsEnabled} onChange={handleChange} />
              <span className="text-sm">Enable Notifications</span>
            </label>
          </div>
        </section>

        {/* Insights Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Sparkles size={24} className="text-[#1B5E57]" />
            <h2 className="text-xl font-semibold text-[#3E3E3E]">Wellness Personalization</h2>
          </div>
          <textarea name="careerGoals" placeholder="Career Aspirations" value={formData.careerGoals} onChange={handleChange} className="input" />
          <textarea name="challenge" placeholder="Biggest Challenge Right Now" value={formData.challenge} onChange={handleChange} className="input mt-2" />
        </section>

        {/* Subscription Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <CreditCard size={24} className="text-[#1B5E57]" />
            <h2 className="text-xl font-semibold text-[#3E3E3E]">Subscription</h2>
          </div>
          <div className="bg-white/80 border border-[#D5E3D1] rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-700">Plan: <strong>{formData.subscriptionPlan}</strong></p>
            <p className="text-sm text-gray-700">Renews on: {formData.renewalDate || 'N/A'}</p>
            <p className="text-sm text-gray-700">Billing Info: {formData.billingInfo || 'Not Provided'}</p>
          </div>
        </section>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            className="bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] text-white px-6 py-2 rounded-lg font-medium hover:scale-105 transition"
          >
            Save Changes
          </button>
        </div>
      </div>
    </SidebarLayout>
  );
}





