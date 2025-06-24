const express = require('express');
const router = express.Router();
const axios = require('axios');

// Verify Codeforces handle
router.get('/verify/:handle', async (req, res) => {
  try {
    const { handle } = req.params;
    
    const response = await axios.get(`${process.env.CODEFORCES_API_URL}/user.info?handles=${handle}`);
    
    if (response.data.status === 'OK') {
      const userInfo = response.data.result[0];
      res.json({
        exists: true,
        handle: userInfo.handle,
        rating: userInfo.rating || 0,
        maxRating: userInfo.maxRating || 0,
        rank: userInfo.rank || 'unrated',
        contribution: userInfo.contribution || 0,
        friendOfCount: userInfo.friendOfCount || 0,
        titlePhoto: userInfo.titlePhoto,
        avatar: userInfo.avatar
      });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    res.json({ exists: false });
  }
});

// Get user submissions
router.get('/submissions/:handle', async (req, res) => {
  try {
    const { handle } = req.params;
    const { count = 100 } = req.query;
    
    const response = await axios.get(`${process.env.CODEFORCES_API_URL}/user.status?handle=${handle}&count=${count}`);
    
    if (response.data.status === 'OK') {
      const submissions = response.data.result;
      res.json(submissions);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user rating history
router.get('/rating/:handle', async (req, res) => {
  try {
    const { handle } = req.params;
    
    const response = await axios.get(`${process.env.CODEFORCES_API_URL}/user.rating?handle=${handle}`);
    
    if (response.data.status === 'OK') {
      const ratingHistory = response.data.result;
      res.json(ratingHistory);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user blog entries
router.get('/blog/:handle', async (req, res) => {
  try {
    const { handle } = req.params;
    
    const response = await axios.get(`${process.env.CODEFORCES_API_URL}/user.blogEntries?handle=${handle}`);
    
    if (response.data.status === 'OK') {
      const blogEntries = response.data.result;
      res.json(blogEntries);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user friends
router.get('/friends/:handle', async (req, res) => {
  try {
    const { handle } = req.params;
    
    const response = await axios.get(`${process.env.CODEFORCES_API_URL}/user.friends?onlyOnline=false`);
    
    if (response.data.status === 'OK') {
      const friends = response.data.result;
      res.json(friends);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 