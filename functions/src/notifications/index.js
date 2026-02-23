/**
 * Notification Cloud Functions — Barrel Export
 * 4 categories: daily_rhythm, insights_learning, social_connection, milestones_reflection
 */

const {sendDailyRhythm} = require("./dailyRhythm");
const {sendInsights} = require("./insights");
const {onNewDirectMessage, onNewConnection} = require("./social");
const {sendMilestones} = require("./milestones");

module.exports = {
  sendDailyRhythm,
  sendInsights,
  onNewDirectMessage,
  onNewConnection,
  sendMilestones,
};
