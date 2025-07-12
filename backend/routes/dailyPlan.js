// backend/routes/dailyPlan.js

const express = require('express');
const router = express.Router();
const { db } = require('../firebase/firebase');
const generatePlan = require('../services/openaiService');

// POST /api/generate-daily-plan
router.post('/', async (req, res) => {
  const { uid, modifier, forceNew = false } = req.body;

  if (!uid) return res.status(400).json({ error: 'Missing user ID (uid)' });

  try {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};

    const moodsRef = userRef.collection('moods');
    const moodSnap = await moodsRef.orderBy('timestamp', 'desc').limit(1).get();
    const latestMood = !moodSnap.empty ? moodSnap.docs[0].data() : null;

    const goalsSnap = await db
      .collection('goals')
      .where('userId', '==', uid)
      .get();

    const goals = goalsSnap.docs.map(doc => doc.data());

    // Check if plan exists today (unless forceNew is true)
    if (!forceNew) {
      const dailyPlansRef = userRef.collection('dailyPlans');
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const existingSnap = await dailyPlansRef
        .where('createdAt', '>=', startOfDay)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        const existing = existingSnap.docs[0].data();
        return res.json({ plan: existing.content });
      }
    }

    // Generate new plan with optional modifier
    const plan = await generatePlan({
      name: userData.name || 'Friend',
      preferences: userData.preferences || {},
      mood: latestMood,
      goals,
      modifier
    });

    // Save new plan
    await userRef.collection('dailyPlans').add({
      content: plan,
      createdAt: new Date(),
      modifier: modifier || null
    });

    res.json({ plan });
  } catch (error) {
    console.error('Error generating daily plan:', error);
    res.status(500).json({ error: 'Failed to generate plan' });
  }
});

module.exports = router;


