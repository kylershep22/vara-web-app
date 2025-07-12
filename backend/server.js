// backend/server.js

require('dotenv').config({ path: './backend/.env' }); // ⬅ explicit path

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const dailyPlanRoute = require('./routes/dailyPlan');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/generate-daily-plan', dailyPlanRoute);

// Health check
app.get('/', (req, res) => {
  res.send('Wellness AI backend is running ✅');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
