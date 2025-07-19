import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { format, subDays, isSameDay } from "date-fns";
import { triggerConfetti } from "../../utils/confetti"; // 🎉 Confetti helper
import EditHabitForm from "./EditHabitForm";

export default function HabitList({ userId, goalId }) {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [celebration, setCelebration] = useState(null);
  const [editingHabitId, setEditingHabitId] = useState(null);
  const today = new Date().toDateString();

  const fetchHabits = async () => {
    try {
      const q = query(
        collection(db, "habits"),
        where("userId", "==", userId),
        where("goalId", "==", goalId),
        where("active", "==", true)
      );
      const snapshot = await getDocs(q);
      const habitList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setHabits(habitList);
    } catch (err) {
      console.error("Error fetching habits:", err);
    } finally {
      setLoading(false);
    }
  };

  const markHabitDone = async (habit) => {
    const habitRef = doc(db, "habits", habit.id);
    const today = new Date();
    const last = habit.lastCompletedAt?.toDate?.();
    let newStreak = 1;

    if (last) {
      const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        newStreak = (habit.streak || 0) + 1;
      } else if (diffDays === 0) {
        return;
      }
    }

    try {
      await updateDoc(habitRef, {
        completions: arrayUnion({ date: Timestamp.now() }),
        lastCompletedAt: Timestamp.now(),
        streak: newStreak,
      });

      if (newStreak > 0 && newStreak % 7 === 0) {
        triggerConfetti();
        setCelebration(`🎉 You're on a ${newStreak}-day streak for "${habit.title}"! Keep going!`);
        setTimeout(() => setCelebration(null), 5000);
      }

      fetchHabits();
    } catch (err) {
      console.error("Error marking habit complete:", err);
    }
  };

  const handleSaveEdit = () => {
    setEditingHabitId(null);
    fetchHabits();
  };

  const getLast7Days = () => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        label: format(date, 'EEE'),
        date,
      };
    });
  };

  useEffect(() => {
    if (userId && goalId) fetchHabits();
  }, [userId, goalId]);

  if (loading) return <p>Loading habits...</p>;
  if (habits.length === 0) return <p className="text-gray-500">No habits yet.</p>;

  return (
    <div className="space-y-4 relative">
      {celebration && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-[9999] bg-white border border-[#F4C542] px-6 py-3 rounded-xl shadow-lg text-[#1B5E57] text-center font-semibold animate-fadeIn">
          {celebration}
        </div>
      )}

      {habits.map((habit) => {
        const completedToday = habit.completions?.some((c) =>
          c.date?.toDate?.().toDateString() === today
        );

        return (
          <div
            key={habit.id}
            className="p-4 bg-white rounded-xl border border-[#D5E3D1] shadow space-y-2"
          >
            {editingHabitId === habit.id ? (
              <EditHabitForm
                habit={habit}
                onCancel={() => setEditingHabitId(null)}
                onSave={handleSaveEdit}
              />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#3E3E3E] font-medium">{habit.title}</p>
                    <p className="text-sm text-[#9AAE8C]">Streak: {habit.streak || 0}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingHabitId(habit.id)}
                      className="px-3 py-1 text-xs bg-yellow-300 rounded hover:bg-yellow-400"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => markHabitDone(habit)}
                      disabled={completedToday}
                      className={`px-4 py-2 rounded-lg text-sm transition ${
                        completedToday
                          ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                          : "bg-[#1B5E57] text-white hover:bg-[#144d47]"
                      }`}
                    >
                      {completedToday ? "Done Today" : "Mark Done"}
                    </button>
                  </div>
                </div>

                {/* Weekly calendar */}
                <div className="flex gap-2 mt-2">
                  {getLast7Days().map(({ label, date }) => {
                    const done = habit.completions?.some((c) =>
                      isSameDay(c.date?.toDate?.(), date)
                    );
                    return (
                      <div key={label} className="flex flex-col items-center">
                        <span className="text-xs text-gray-500">{label}</span>
                        <div
                          className={`w-5 h-5 rounded-full mt-1 ${
                            done ? "bg-[#1B5E57]" : "bg-gray-300"
                          }`}
                        ></div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}




