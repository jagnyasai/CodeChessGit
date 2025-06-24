const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

// Get suggested problems based on user rating
router.get('/suggested', async (req, res) => {
  try {
    const { rating } = req.query;
    const userRating = parseInt(rating) || 1200;
    
    // Get problems from Codeforces API
    const response = await axios.get(`${process.env.CODEFORCES_API_URL}/problemset.problems`);
    
    if (response.data.status === 'OK') {
      const problems = response.data.result.problems;
      
      // Filter problems around user's rating (±200)
      const suggestedProblems = problems
        .filter(problem => 
          problem.rating && 
          problem.rating >= userRating - 200 && 
          problem.rating <= userRating + 200
        )
        .sort((a, b) => Math.abs(a.rating - userRating) - Math.abs(b.rating - userRating))
        .slice(0, 10)
        .map(problem => ({
          contestId: problem.contestId,
          index: problem.index,
          name: problem.name,
          rating: problem.rating,
          tags: problem.tags,
          url: `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`
        }));

      res.json(suggestedProblems);
    } else {
      res.status(500).json({ error: 'Failed to fetch problems' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get problems by rating range
router.get('/by-rating', async (req, res) => {
  try {
    const { minRating, maxRating, count = 20 } = req.query;
    
    const response = await axios.get(`${process.env.CODEFORCES_API_URL}/problemset.problems`);
    
    if (response.data.status === 'OK') {
      const problems = response.data.result.problems;
      
      let filteredProblems = problems.filter(problem => problem.rating);
      
      if (minRating) {
        filteredProblems = filteredProblems.filter(problem => problem.rating >= parseInt(minRating));
      }
      
      if (maxRating) {
        filteredProblems = filteredProblems.filter(problem => problem.rating <= parseInt(maxRating));
      }
      
      const selectedProblems = filteredProblems
        .sort((a, b) => a.rating - b.rating)
        .slice(0, parseInt(count))
        .map(problem => ({
          contestId: problem.contestId,
          index: problem.index,
          name: problem.name,
          rating: problem.rating,
          tags: problem.tags,
          url: `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`
        }));

      res.json(selectedProblems);
    } else {
      res.status(500).json({ error: 'Failed to fetch problems' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get problems by tags
router.get('/by-tags', async (req, res) => {
  try {
    const { tags, count = 20 } = req.query;
    const tagArray = tags ? tags.split(',') : [];
    
    const response = await axios.get(`${process.env.CODEFORCES_API_URL}/problemset.problems`);
    
    if (response.data.status === 'OK') {
      const problems = response.data.result.problems;
      
      let filteredProblems = problems.filter(problem => problem.rating);
      
      if (tagArray.length > 0) {
        filteredProblems = filteredProblems.filter(problem => 
          tagArray.some(tag => problem.tags.includes(tag))
        );
      }
      
      const selectedProblems = filteredProblems
        .sort((a, b) => a.rating - b.rating)
        .slice(0, parseInt(count))
        .map(problem => ({
          contestId: problem.contestId,
          index: problem.index,
          name: problem.name,
          rating: problem.rating,
          tags: problem.tags,
          url: `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`
        }));

      res.json(selectedProblems);
    } else {
      res.status(500).json({ error: 'Failed to fetch problems' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get problem details
router.get('/:contestId/:index', async (req, res) => {
  try {
    const { contestId, index } = req.params;
    
    const response = await axios.get(`${process.env.CODEFORCES_API_URL}/problemset.problems`);
    
    if (response.data.status === 'OK') {
      const problems = response.data.result.problems;
      const problem = problems.find(p => p.contestId.toString() === contestId && p.index === index);
      
      if (problem) {
        res.json({
          contestId: problem.contestId,
          index: problem.index,
          name: problem.name,
          rating: problem.rating,
          tags: problem.tags,
          url: `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`
        });
      } else {
        res.status(404).json({ error: 'Problem not found' });
      }
    } else {
      res.status(500).json({ error: 'Failed to fetch problem' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get problem statement (scrape from Codeforces)
router.get('/statement/:contestId/:index', async (req, res) => {
  try {
    const { contestId, index } = req.params;
    const url = `https://codeforces.com/problemset/problem/${contestId}/${index}`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const statementHtml = $('.problem-statement').html();
    if (statementHtml) {
      res.json({ statement: statementHtml });
    } else {
      res.status(404).json({ error: 'Problem statement not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch problem statement' });
  }
});

module.exports = router; 