// src/components/dashboard/GoalCreateModal.jsx

import React from 'react';
import { X } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import GoalCreationForm from '../goals/GoalCreationForm';

const GoalCreateModal = ({ userId, onClose, onSave }) => {
  const handleSave = async (goalData) => {
    try {
      await addDoc(collection(db, 'goals'), goalData);
      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error; // Let GoalCreationForm handle the error display
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-divider sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-soft-charcoal">Create New Goal</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dew-sage-light rounded-lg transition-colors"
          >
            <X size={20} className="text-muted-sage-gray" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6">
          <GoalCreationForm
            userId={userId}
            onSave={handleSave}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default GoalCreateModal;
