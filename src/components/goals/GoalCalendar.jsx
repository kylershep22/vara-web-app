// src/components/goals/GoalCalendar.jsx
import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { auth } from '../../firebase';

export default function GoalCalendar() {
  const [value, setValue] = useState(new Date());
  const [goalDates, setGoalDates] = useState([]);
  const [selectedGoals, setSelectedGoals] = useState([]);

  useEffect(() => {
    const fetchGoals = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(collection(db, 'goals'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setGoalDates(data);
    };

    fetchGoals();
  }, []);

  const handleDateClick = (date) => {
    const matches = goalDates.filter(goal => {
      const goalDate = new Date(goal.dueDate);
      return (
        goalDate.getDate() === date.getDate() &&
        goalDate.getMonth() === date.getMonth() &&
        goalDate.getFullYear() === date.getFullYear()
      );
    });
    setSelectedGoals(matches);
    setValue(date);
  };

  const tileContent = ({ date }) => {
    const hasGoal = goalDates.some(goal => {
      const goalDate = new Date(goal.dueDate);
      return goalDate.toDateString() === date.toDateString();
    });

    return hasGoal ? <div className="bg-[#B8CDBA] rounded-full w-2 h-2 mx-auto mt-1" /> : null;
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-[#D5E3D1] shadow-sm">
      <Calendar
        onClickDay={handleDateClick}
        value={value}
        tileContent={tileContent}
      />
      {selectedGoals.length > 0 && (
        <div className="mt-4 bg-[#F9FAF9] p-4 border border-[#D5E3D1] rounded-lg">
          <h3 className="text-lg font-semibold text-[#1B5E57] mb-2">Goals for {value.toDateString()}</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {selectedGoals.map(goal => (
              <li key={goal.id}>{goal.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
