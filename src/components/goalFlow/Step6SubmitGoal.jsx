import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

export default function Step6SubmitGoal({ data, resetFlow }) {
  const [status, setStatus] = useState('saving'); // 'saving', 'success', 'error'
  const { currentUser } = useAuth();

  useEffect(() => {
    const saveGoal = async () => {
      try {
        await addDoc(collection(db, 'users', currentUser.uid, 'goals'), {
          ...data,
          createdAt: serverTimestamp(),
        });
        setStatus('success');
      } catch (error) {
        console.error('Error saving goal:', error);
        setStatus('error');
      }
    };

    saveGoal();
  }, [currentUser, data]);

  return (
    <div className="max-w-xl mx-auto text-center p-6 bg-mist-white rounded-lg shadow-md">
      {status === 'saving' && (
        <>
          <h2 className="text-2xl font-bold text-evergreen-teal mb-4">Saving your goal...</h2>
          <p className="text-soft-charcoal">Hang tight, we’re almost there.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <h2 className="text-2xl font-bold text-evergreen-teal mb-4">🎉 You Did It!</h2>
          <p className="text-soft-charcoal mb-6">
            Your wellness journey has officially begun. We'll help you stay on track!
          </p>
          <button
            onClick={resetFlow}
            className="mt-4 px-6 py-2 bg-sunrise-amber text-white rounded hover:bg-golden-apricot transition"
          >
            Set Another Goal
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Oops! Something went wrong.</h2>
          <p className="text-soft-charcoal mb-4">Please try again in a few moments.</p>
        </>
      )}
    </div>
  );
}
