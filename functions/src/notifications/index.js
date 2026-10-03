/**
 * Notification Cloud Functions — Barrel Export
 * 4 categories: daily_rhythm, insights_learning, social_connection, milestones_reflection
 * + habit reminders
 *
 * The social_connection pushes are no longer here. NPM-3a-i made the
 * notifications codebase (functions-notifications/) the single Community
 * sender and removed onNewDirectMessage and onNewConnection from this one.
 */

const {sendDailyRhythm} = require("./dailyRhythm");
const {sendInsights} = require("./insights");
const {sendMilestones} = require("./milestones");
const {sendHabitReminders} = require("./habitReminders");

module.exports = {
  sendDailyRhythm,
  sendInsights,
  sendMilestones,
  sendHabitReminders,
};
