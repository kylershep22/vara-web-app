import React from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

export default function GoalCard({ goal, onDelete, onEdit }) {
  const { currentUser } = useAuth();

  const handleDelete = async () => {
    const confirm = window.confirm('Are you sure you want to delete this goal?');
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'goals', goal.id));
      onDelete(goal.id); // Let parent remove from UI
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  return (
    <div className="bg-white shadow rounded p-4 border-l-4 border-[#1B5E57] mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold text-[#1B5E57]">{goal.goal}</h3>
          <p className="text-sm text-[#3E3E3E]">
            Focus: {goal.primaryFocus} → {goal.refinedFocus}
          </p>
          <p className="text-sm text-[#3E3E3E]">Timeframe: {goal.timeframe}</p>
          {goal.targetDate && (
            <p className="text-sm text-[#3E3E3E]">Target: {goal.targetDate}</p>
          )}
        </div>
        <div className="text-right space-x-2">
          <button
            onClick={() => onEdit(goal)}
            className="text-sm text-blue-500 hover:underline"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="text-sm text-red-500 hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}


