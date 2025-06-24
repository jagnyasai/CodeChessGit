const express = require('express');
const router = express.Router();
const User = require('../models/User');
const axios = require('axios');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Get user profile
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('currentGame')
      .select('-googleId');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Codeforces handle
router.post('/verify-handle', isAuthenticated, async (req, res) => {
  try {
    const { handle } = req.body;
    
    if (!handle) {
      return res.status(400).json({ error: 'Handle is required' });
    }

    // Check if handle already exists
    const existingUser = await User.findOne({ codeforcesHandle: handle });
    if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
      return res.status(400).json({ error: 'Handle already taken' });
    }

    // Verify handle exists on Codeforces
    try {
      const response = await axios.get(`${process.env.CODEFORCES_API_URL}/user.info?handles=${handle}`);
      
      if (response.data.status === 'OK') {
        const userInfo = response.data.result[0];
        
        // Get user's solved problems
        const submissionsResponse = await axios.get(
          `${process.env.CODEFORCES_API_URL}/user.status?handle=${handle}&count=1000`
        );
        
        let solvedProblems = [];
        if (submissionsResponse.data.status === 'OK') {
          const submissions = submissionsResponse.data.result;
          const solvedSet = new Set();
          
          submissions.forEach(submission => {
            if (submission.verdict === 'OK') {
              const problemKey = `${submission.problem.contestId}${submission.problem.index}`;
              if (!solvedSet.has(problemKey)) {
                solvedSet.add(problemKey);
                solvedProblems.push({
                  contestId: submission.problem.contestId,
                  index: submission.problem.index,
                  name: submission.problem.name,
                  rating: submission.problem.rating || 0,
                  solvedAt: new Date(submission.creationTimeSeconds * 1000)
                });
              }
            }
          });
        }

        // Update user
        await User.findByIdAndUpdate(req.user._id, {
          codeforcesHandle: handle,
          isVerified: true,
          rating: userInfo.rating || 0,
          solvedProblems: solvedProblems
        });

        res.json({ 
          success: true, 
          message: 'Handle verified successfully',
          rating: userInfo.rating || 0,
          solvedCount: solvedProblems.length
        });
      } else {
        res.status(400).json({ error: 'Invalid Codeforces handle' });
      }
    } catch (error) {
      res.status(400).json({ error: 'Could not verify handle. Please check if it exists.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user preferences
router.put('/preferences', isAuthenticated, async (req, res) => {
  try {
    const { language, theme } = req.body;
    
    const updateData = {};
    if (language) updateData['preferences.language'] = language;
    if (theme) updateData['preferences.theme'] = theme;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('-googleId');

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find({ isVerified: true })
      .select('name codeforcesHandle rating gamesPlayed gamesWon avatar')
      .sort({ rating: -1, gamesWon: -1 })
      .limit(50);
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user statistics
router.get('/stats/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('name codeforcesHandle rating solvedProblems gamesPlayed gamesWon achievements');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stats = {
      name: user.name,
      handle: user.codeforcesHandle,
      rating: user.rating,
      solvedCount: user.solvedProblems.length,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      winRate: user.gamesPlayed > 0 ? (user.gamesWon / user.gamesPlayed * 100).toFixed(1) : 0,
      achievements: user.achievements
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 