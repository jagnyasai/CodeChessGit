const express = require('express');
const router = express.Router();
const axios = require('axios');

// Get recent contests
router.get('/recent', async (req, res) => {
  try {
    const response = await axios.get(`${process.env.CODEFORCES_API_URL}/contest.list`);
    
    if (response.data.status === 'OK') {
      const contests = response.data.result;
      
      // Filter recent contests (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentContests = contests
        .filter(contest => {
          const contestDate = new Date(contest.startTimeSeconds * 1000);
          return contestDate >= thirtyDaysAgo && contest.phase === 'FINISHED';
        })
        .sort((a, b) => b.startTimeSeconds - a.startTimeSeconds)
        .slice(0, 20)
        .map(contest => ({
          id: contest.id,
          name: contest.name,
          type: contest.type,
          phase: contest.phase,
          startTime: new Date(contest.startTimeSeconds * 1000),
          duration: contest.durationSeconds,
          url: `https://codeforces.com/contest/${contest.id}`
        }));

      res.json(recentContests);
    } else {
      res.status(500).json({ error: 'Failed to fetch contests' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get upcoming contests
router.get('/upcoming', async (req, res) => {
  try {
    const response = await axios.get(`${process.env.CODEFORCES_API_URL}/contest.list`);
    
    if (response.data.status === 'OK') {
      const contests = response.data.result;
      
      const upcomingContests = contests
        .filter(contest => contest.phase === 'BEFORE')
        .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)
        .slice(0, 10)
        .map(contest => ({
          id: contest.id,
          name: contest.name,
          type: contest.type,
          phase: contest.phase,
          startTime: new Date(contest.startTimeSeconds * 1000),
          duration: contest.durationSeconds,
          url: `https://codeforces.com/contest/${contest.id}`
        }));

      res.json(upcomingContests);
    } else {
      res.status(500).json({ error: 'Failed to fetch contests' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get contest details
router.get('/:contestId', async (req, res) => {
  try {
    const { contestId } = req.params;
    
    const response = await axios.get(`${process.env.CODEFORCES_API_URL}/contest.standings?contestId=${contestId}&from=1&count=1`);
    
    if (response.data.status === 'OK') {
      const contest = response.data.result.contest;
      const problems = response.data.result.problems;
      
      res.json({
        id: contest.id,
        name: contest.name,
        type: contest.type,
        phase: contest.phase,
        startTime: new Date(contest.startTimeSeconds * 1000),
        duration: contest.durationSeconds,
        url: `https://codeforces.com/contest/${contest.id}`,
        problems: problems.map(problem => ({
          index: problem.index,
          name: problem.name,
          rating: problem.rating,
          tags: problem.tags,
          url: `https://codeforces.com/contest/${contest.id}/problem/${problem.index}`
        }))
      });
    } else {
      res.status(404).json({ error: 'Contest not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get contest standings
router.get('/:contestId/standings', async (req, res) => {
  try {
    const { contestId } = req.params;
    const { from = 1, count = 50 } = req.query;
    
    const response = await axios.get(`${process.env.CODEFORCES_API_URL}/contest.standings?contestId=${contestId}&from=${from}&count=${count}`);
    
    if (response.data.status === 'OK') {
      const contest = response.data.result.contest;
      const problems = response.data.result.problems;
      const rows = response.data.result.rows;
      
      res.json({
        contest: {
          id: contest.id,
          name: contest.name,
          type: contest.type,
          phase: contest.phase
        },
        problems: problems.map(problem => ({
          index: problem.index,
          name: problem.name,
          rating: problem.rating
        })),
        standings: rows.map(row => ({
          rank: row.rank,
          party: {
            members: row.party.members.map(member => ({
              handle: member.handle
            })),
            participantType: row.party.participantType,
            teamId: row.party.teamId
          },
          points: row.points,
          penalty: row.penalty,
          problemResults: row.problemResults.map(result => ({
            points: result.points,
            rejectedAttemptCount: result.rejectedAttemptCount,
            type: result.type,
            bestSubmissionTimeSeconds: result.bestSubmissionTimeSeconds
          }))
        }))
      });
    } else {
      res.status(404).json({ error: 'Contest not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 