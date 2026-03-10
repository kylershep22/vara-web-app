// src/components/trackers/DigitalWellbeingDashboard.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { Smartphone, Coffee, Moon, Eye, Clock, TrendingDown, CheckCircle, AlertTriangle } from 'lucide-react';

const DigitalWellbeingDashboard = ({ userId }) => {
  const [wellbeingRecords, setWellbeingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [breakReminder, setBreakReminder] = useState(true);
  const [lastBreak, setLastBreak] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchWellbeingRecords();
      checkLastBreak();
    }
  }, [userId]);

  useEffect(() => {
    // Check for break reminder every minute
    const interval = setInterval(() => {
      if (breakReminder) {
        checkBreakNeeded();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [breakReminder, lastBreak]);

  const fetchWellbeingRecords = async () => {
    setLoading(true);
    try {
      const recordsQuery = query(
        collection(db, 'digitalWellbeing'),
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(30)
      );

      const snapshot = await getDocs(recordsQuery);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setWellbeingRecords(data);
    } catch (error) {
      console.error('Error fetching digital wellbeing records:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkLastBreak = () => {
    const lastBreakTime = localStorage.getItem('lastBreakTime');
    if (lastBreakTime) {
      setLastBreak(new Date(lastBreakTime));
    }
  };

  const checkBreakNeeded = () => {
    if (!lastBreak) return;

    const now = new Date();
    const minutesSinceBreak = (now - lastBreak) / 1000 / 60;

    // Remind every 60 minutes
    if (minutesSinceBreak >= 60) {
      showBreakNotification();
    }
  };

  const showBreakNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Time for a Break!', {
        body: 'You\'ve been working for over an hour. Take a 5-minute break to rest your eyes and mind.',
        icon: '/logo192.png'
      });
    }
  };

  const logBreak = () => {
    const now = new Date();
    setLastBreak(now);
    localStorage.setItem('lastBreakTime', now.toISOString());
  };

  const getTodayStats = () => {
    const today = new Date().toDateString();
    const todayRecord = wellbeingRecords.find(r => {
      const recordDate = r.date?.toDate ? r.date.toDate() : new Date(r.date);
      return recordDate.toDateString() === today;
    });

    return todayRecord || {
      screenTimeMinutes: 0,
      breaksTaken: 0,
      focusSessionsCompleted: 0,
      eyeStrainReported: false
    };
  };

  const getWeeklyAverage = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyRecords = wellbeingRecords.filter(r => {
      const recordDate = r.date?.toDate ? r.date.toDate() : new Date(r.date);
      return recordDate >= oneWeekAgo;
    });

    if (weeklyRecords.length === 0) return { screenTime: 0, breaks: 0 };

    const totalScreenTime = weeklyRecords.reduce((sum, r) => sum + (r.screenTimeMinutes || 0), 0);
    const totalBreaks = weeklyRecords.reduce((sum, r) => sum + (r.breaksTaken || 0), 0);

    return {
      screenTime: Math.round(totalScreenTime / weeklyRecords.length),
      breaks: Math.round(totalBreaks / weeklyRecords.length)
    };
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const todayStats = getTodayStats();
  const weeklyAvg = getWeeklyAverage();

  const getMinutesSinceLastBreak = () => {
    if (!lastBreak) return 0;
    const now = new Date();
    return Math.floor((now - lastBreak) / 1000 / 60);
  };

  const minutesSinceBreak = getMinutesSinceLastBreak();
  const breakNeeded = minutesSinceBreak >= 60;

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
            <Smartphone className="text-indigo-600" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-indigo-900 mb-2">Digital Wellbeing</h2>
            <p className="text-indigo-700 mb-2">
              Maintain a healthy relationship with technology through mindful screen time, regular breaks,
              and intentional device usage. Protect your eyes, posture, and mental clarity.
            </p>
            <p className="text-sm text-indigo-600">
              The 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds.
            </p>
          </div>
        </div>
      </div>

      {/* Break Reminder */}
      {breakNeeded && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-6 animate-pulse">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-orange-600 flex-shrink-0" size={32} />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-orange-900 mb-2">Time for a Break!</h3>
              <p className="text-orange-700 mb-4">
                You haven't taken a break in {minutesSinceBreak} minutes. Take 5-10 minutes to:
              </p>
              <ul className="text-sm text-orange-700 space-y-1 mb-4">
                <li>• Stand up and stretch</li>
                <li>• Look away from screens (20-20-20 rule)</li>
                <li>• Get some water or a healthy snack</li>
                <li>• Take a short walk</li>
              </ul>
              <button
                onClick={logBreak}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition flex items-center gap-2"
              >
                <Coffee size={20} />
                I Took a Break
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-divider p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-blue-600" size={24} />
            <span className="text-sm text-muted-sage-gray">Screen Time</span>
          </div>
          <div className="text-3xl font-bold text-soft-charcoal">{todayStats.screenTimeMinutes}</div>
          <div className="text-sm text-muted-sage-gray">Minutes today</div>
        </div>
        <div className="bg-white rounded-xl border border-divider p-6">
          <div className="flex items-center gap-3 mb-2">
            <Coffee className="text-evergreen-teal" size={24} />
            <span className="text-sm text-muted-sage-gray">Breaks Taken</span>
          </div>
          <div className="text-3xl font-bold text-soft-charcoal">{todayStats.breaksTaken}</div>
          <div className="text-sm text-muted-sage-gray">Today</div>
        </div>
        <div className="bg-white rounded-xl border border-divider p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="text-purple-600" size={24} />
            <span className="text-sm text-muted-sage-gray">Focus Sessions</span>
          </div>
          <div className="text-3xl font-bold text-soft-charcoal">{todayStats.focusSessionsCompleted}</div>
          <div className="text-sm text-muted-sage-gray">Completed</div>
        </div>
        <div className="bg-white rounded-xl border border-divider p-6">
          <div className="flex items-center gap-3 mb-2">
            <Eye className={todayStats.eyeStrainReported ? 'text-red-600' : 'text-muted-sage-gray/60'} size={24} />
            <span className="text-sm text-muted-sage-gray">Eye Strain</span>
          </div>
          <div className="text-xl font-bold text-soft-charcoal">
            {todayStats.eyeStrainReported ? 'Reported' : 'None'}
          </div>
          <div className="text-sm text-muted-sage-gray">Status</div>
        </div>
      </div>

      {/* Weekly Trends */}
      <div className="bg-white rounded-xl border border-divider p-6">
        <h3 className="text-lg font-semibold text-soft-charcoal mb-4">Weekly Averages</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-sage-gray">Screen Time</span>
              <span className="text-lg font-bold text-soft-charcoal">{weeklyAvg.screenTime} min/day</span>
            </div>
            <div className="w-full bg-silver-sage/30 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((weeklyAvg.screenTime / 480) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-muted-sage-gray mt-1">Target: &lt; 8 hours/day (480 min)</div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-sage-gray">Breaks Per Day</span>
              <span className="text-lg font-bold text-soft-charcoal">{weeklyAvg.breaks} breaks</span>
            </div>
            <div className="w-full bg-silver-sage/30 rounded-full h-2">
              <div
                className="bg-evergreen-teal h-2 rounded-full transition-all"
                style={{ width: `${Math.min((weeklyAvg.breaks / 8) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-muted-sage-gray mt-1">Target: 8+ breaks/day (hourly)</div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-xl border border-divider p-6">
        <h3 className="text-lg font-semibold text-soft-charcoal mb-4">Break Reminder Settings</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-dew-sage-light rounded-lg">
            <div>
              <div className="font-medium text-soft-charcoal">Enable Break Reminders</div>
              <div className="text-sm text-muted-sage-gray">Get notified every hour to take a break</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={breakReminder}
                onChange={(e) => setBreakReminder(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-silver-sage/30 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-divider after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {breakReminder && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-blue-600 mt-0.5" size={20} />
                <div>
                  <div className="font-medium text-blue-900 mb-1">Browser Notifications</div>
                  <div className="text-sm text-blue-700 mb-3">
                    {Notification.permission === 'granted' ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle size={14} /> Notifications enabled
                      </span>
                    ) : (
                      'Enable browser notifications for break reminders'
                    )}
                  </div>
                  {Notification.permission !== 'granted' && (
                    <button
                      onClick={requestNotificationPermission}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                    >
                      Enable Notifications
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {lastBreak && (
            <div className="p-4 bg-teal-light rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-soft-charcoal">Last Break</div>
                  <div className="text-sm text-evergreen-teal">
                    {minutesSinceBreak} minutes ago
                  </div>
                </div>
                <button
                  onClick={logBreak}
                  className="px-4 py-2 bg-evergreen-teal text-white rounded-lg text-sm font-medium hover:bg-evergreen-teal/90 transition"
                >
                  Reset Timer
                </button>
              </div>
            </div>
          )}

          {!lastBreak && (
            <button
              onClick={logBreak}
              className="w-full px-6 py-3 bg-evergreen-teal text-white rounded-lg font-semibold hover:bg-evergreen-teal/90 transition flex items-center justify-center gap-2"
            >
              <Coffee size={20} />
              Start Break Timer
            </button>
          )}
        </div>
      </div>

      {/* Digital Sunset */}
      <div className="bg-white rounded-xl border border-divider p-6">
        <div className="flex items-start gap-4">
          <Moon className="text-indigo-600" size={32} />
          <div>
            <h3 className="text-lg font-semibold text-soft-charcoal mb-2">Digital Sunset</h3>
            <p className="text-muted-sage-gray mb-4">
              Reduce screen time 1-2 hours before bed to improve sleep quality. Blue light from screens
              can disrupt your circadian rhythm and make it harder to fall asleep.
            </p>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h4 className="font-semibold text-indigo-900 mb-2">Evening Routine Tips:</h4>
              <ul className="text-sm text-indigo-700 space-y-1">
                <li>• Set a device curfew (e.g., no screens after 9pm)</li>
                <li>• Use night mode/blue light filters on devices</li>
                <li>• Read a physical book instead of e-books</li>
                <li>• Journal, meditate, or practice gratitude</li>
                <li>• Prepare for tomorrow without screens</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900 mb-2">Healthy Screen Habits</h3>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Use the 20-20-20 rule: Every 20 min, look 20 feet away for 20 seconds</li>
          <li>• Take a 5-10 minute break every hour</li>
          <li>• Adjust screen brightness to match your environment</li>
          <li>• Position screens at arm's length, slightly below eye level</li>
          <li>• Blink frequently to prevent dry eyes</li>
          <li>• Use blue light filters in the evening</li>
        </ul>
      </div>
    </div>
  );
};

export default DigitalWellbeingDashboard;
