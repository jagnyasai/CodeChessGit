const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const User = require('../models/User');
const axios = require('axios');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Create a new game (find online opponent)
router.post('/find-online', isAuthenticated, async (req, res) => {
  try {
    if (!req.user.isVerified) {
      return res.status(400).json({ error: 'Please verify your Codeforces handle first' });
    }

    // Check if user is already in a game
    if (req.user.currentGame) {
      return res.status(400).json({ error: 'You are already in a game' });
    }

    // Find waiting game or create new one
    let game = await Game.findOne({ 
      status: 'waiting', 
      player1: { $ne: req.user._id },
      mode: 'online'
    });

    if (game) {
      // Fully populate both users
      const player1 = await User.findById(game.player1);
      const player2 = await User.findById(req.user._id);

      // Join existing game
      game.player2 = player2._id;
      game.status = 'active';
      game.startTime = new Date();
      
      // Generate problems for the game
      const problems = await generateProblems(player2, player1);
      game.problems = problems;
      
      await game.save();

      // Update both users
      await User.findByIdAndUpdate(player2._id, { currentGame: game._id });
      await User.findByIdAndUpdate(player1._id, { currentGame: game._id });

      // Populate for response
      await game.populate('player1', 'name codeforcesHandle rating avatar');

      res.json({ 
        success: true, 
        game: game,
        opponent: game.player1
      });
    } else {
      // Create new waiting game
      game = new Game({
        player1: req.user._id,
        mode: 'online',
        status: 'waiting'
      });
      
      await game.save();
      await User.findByIdAndUpdate(req.user._id, { currentGame: game._id });

      res.json({ 
        success: true, 
        game: game,
        waiting: true
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create game with friend
router.post('/create-friend', isAuthenticated, async (req, res) => {
  try {
    const { friendHandle } = req.body;
    
    if (!friendHandle) {
      return res.status(400).json({ error: 'Friend handle is required' });
    }

    if (!req.user.isVerified) {
      return res.status(400).json({ error: 'Please verify your Codeforces handle first' });
    }

    // Find friend by handle
    const friend = await User.findOne({ codeforcesHandle: friendHandle, isVerified: true });
    if (!friend) {
      return res.status(404).json({ error: 'Friend not found or not verified' });
    }

    if (friend._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot play against yourself' });
    }

    // Check if either user is in a game
    if (req.user.currentGame || friend.currentGame) {
      return res.status(400).json({ error: 'One of the players is already in a game' });
    }

    // Generate problems
    const problems = await generateProblems(req.user, friend);

    // Create game
    const game = new Game({
      player1: req.user._id,
      player2: friend._id,
      mode: 'friend',
      status: 'active',
      problems: problems,
      startTime: new Date()
    });

    await game.save();

    // Update both users
    await User.findByIdAndUpdate(req.user._id, { currentGame: game._id });
    await User.findByIdAndUpdate(friend._id, { currentGame: game._id });

    res.json({ 
      success: true, 
      game: game,
      opponent: friend
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current game
router.get('/current', isAuthenticated, async (req, res) => {
  try {
    const game = await Game.findById(req.user.currentGame)
      .populate('player1', 'name codeforcesHandle rating avatar')
      .populate('player2', 'name codeforcesHandle')
      .populate('winner', 'name codeforcesHandle');

    if (!game) {
      return res.json({ game: null });
    }

    res.json({ game });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit solution
router.post('/submit', isAuthenticated, async (req, res) => {
  try {
    const { code, language, problemIndex } = req.body;
    
    if (!req.user.currentGame) {
      return res.status(400).json({ error: 'No active game' });
    }

    const game = await Game.findById(req.user.currentGame);
    if (!game || game.status !== 'active') {
      return res.status(400).json({ error: 'Game not found or not active' });
    }

    if (problemIndex >= game.problems.length) {
      return res.status(400).json({ error: 'Invalid problem index' });
    }

    const problem = game.problems[problemIndex];
    
    // Check if problem already solved
    if (problem.solvedBy) {
      return res.status(400).json({ error: 'Problem already solved' });
    }

    // Execute code
    const result = await executeCode(code, language, problem);
    
    // Add submission
    const submission = {
      user: req.user._id,
      code: code,
      language: language,
      verdict: result.verdict,
      submittedAt: new Date(),
      executionTime: result.executionTime,
      memoryUsed: result.memoryUsed
    };

    game.problems[problemIndex].submissions.push(submission);

    // If solution is correct
    if (result.verdict === 'Accepted') {
      game.problems[problemIndex].solvedBy = req.user._id;
      game.problems[problemIndex].solvedAt = new Date();
      game.currentProblemIndex = Math.max(game.currentProblemIndex, problemIndex + 1);

      // Check if game is won
      // Count solved problems by each player
      const player1Solved = game.problems.filter(p => p.solvedBy && p.solvedBy.toString() === game.player1.toString()).length;
      const player2Solved = game.problems.filter(p => p.solvedBy && p.solvedBy.toString() === game.player2.toString()).length;
      let winnerId = null;
      if (player1Solved >= 5) {
        winnerId = game.player1;
      } else if (player2Solved >= 5) {
        winnerId = game.player2;
      }
      if (winnerId) {
        game.winner = winnerId;
        game.status = 'completed';
        game.endTime = new Date();
        game.duration = Math.floor((game.endTime - game.startTime) / 60000);

        // Update user stats
        await User.findByIdAndUpdate(winnerId, {
          $inc: { gamesPlayed: 1, gamesWon: 1 },
          currentGame: null
        });
        const loserId = (winnerId.toString() === game.player1.toString()) ? game.player2 : game.player1;
        await User.findByIdAndUpdate(loserId, {
          $inc: { gamesPlayed: 1 },
          currentGame: null
        });
      }
    }

    await game.save();

    res.json({ 
      success: true, 
      result: result,
      game: game
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave game
router.post('/leave', isAuthenticated, async (req, res) => {
  try {
    if (!req.user.currentGame) {
      return res.status(400).json({ error: 'No active game' });
    }

    const game = await Game.findById(req.user.currentGame);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.status === 'active') {
      // Determine winner
      const opponentId = game.player1.toString() === req.user._id.toString() ? game.player2 : game.player1;
      game.winner = opponentId;
      game.status = 'completed';
      game.endTime = new Date();
      game.duration = Math.floor((game.endTime - game.startTime) / 60000);

      // Update stats
      await User.findByIdAndUpdate(opponentId, {
        $inc: { gamesPlayed: 1, gamesWon: 1 },
        currentGame: null
      });
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { gamesPlayed: 1 },
        currentGame: null
      });
    } else {
      await User.findByIdAndUpdate(req.user._id, { currentGame: null });
    }
    await game.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get game history
router.get('/history', isAuthenticated, async (req, res) => {
  try {
    const games = await Game.find({
      $or: [{ player1: req.user._id }, { player2: req.user._id }],
      status: 'completed'
    })
    .populate('player1', 'name codeforcesHandle')
    .populate('player2', 'name codeforcesHandle')
    .populate('winner', 'name codeforcesHandle')
    .sort({ createdAt: -1 })
    .limit(20);

    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel current game
router.post('/cancel', isAuthenticated, async (req, res) => {
  try {
    if (!req.user.currentGame) {
      return res.status(400).json({ error: 'No active game to cancel' });
    }
    const game = await Game.findById(req.user.currentGame);
    if (!game) {
      await User.findByIdAndUpdate(req.user._id, { currentGame: null });
      return res.json({ success: true });
    }
    if (game.status === 'active') {
      // Canceller loses, opponent wins
      const opponentId = game.player1.toString() === req.user._id.toString() ? game.player2 : game.player1;
      game.winner = opponentId;
      game.status = 'completed';
      game.endTime = new Date();
      game.duration = Math.floor((game.endTime - game.startTime) / 60000);
      await User.findByIdAndUpdate(opponentId, {
        $inc: { gamesPlayed: 1, gamesWon: 1 },
        currentGame: null
      });
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { gamesPlayed: 1 },
        currentGame: null
      });
    } else {
      // Mark game as cancelled if not active
      game.status = 'cancelled';
      game.endTime = new Date();
      await User.findByIdAndUpdate(game.player1, { currentGame: null });
      await User.findByIdAndUpdate(game.player2, { currentGame: null });
    }
    await game.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel all games for the current user
router.post('/cancel-all', isAuthenticated, async (req, res) => {
  try {
    // Set currentGame to null for the user
    await User.findByIdAndUpdate(req.user._id, { currentGame: null });
    // Find all games where the user is player1 or player2 and status is not completed or cancelled
    const games = await Game.find({
      $or: [
        { player1: req.user._id },
        { player2: req.user._id }
      ],
      status: { $in: ['active', 'waiting'] }
    });
    // Mark all such games as cancelled
    for (const game of games) {
      game.status = 'cancelled';
      game.endTime = new Date();
      await game.save();
      // Clear currentGame for both players
      await User.findByIdAndUpdate(game.player1, { currentGame: null });
      await User.findByIdAndUpdate(game.player2, { currentGame: null });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Force-cancel all games for a given Codeforces handle (for testing/admin only)
router.post('/force-cancel-friend', async (req, res) => {
  const { friendHandle, secret } = req.body;
  // Simple secret check for safety (replace 'devsecret' with a real secret in production)
  if (secret !== process.env.FORCE_CANCEL_SECRET && secret !== 'devsecret') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!friendHandle) {
    return res.status(400).json({ error: 'Friend handle is required' });
  }
  try {
    const friend = await User.findOne({ codeforcesHandle: friendHandle });
    if (!friend) {
      return res.status(404).json({ error: 'Friend not found' });
    }
    // Set currentGame to null for the friend
    await User.findByIdAndUpdate(friend._id, { currentGame: null });
    // Find all games where the friend is player1 or player2 and status is not completed or cancelled
    const games = await Game.find({
      $or: [
        { player1: friend._id },
        { player2: friend._id }
      ],
      status: { $in: ['active', 'waiting'] }
    });
    // Mark all such games as cancelled
    for (const game of games) {
      game.status = 'cancelled';
      game.endTime = new Date();
      await game.save();
      await User.findByIdAndUpdate(game.player1, { currentGame: null });
      await User.findByIdAndUpdate(game.player2, { currentGame: null });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to generate problems
async function generateProblems(player1, player2) {
  try {
    // Get problems that neither player has solved
    const player1Solved = new Set(player1.solvedProblems.map(p => `${p.contestId}${p.index}`));
    const player2Solved = new Set(player2.solvedProblems.map(p => `${p.contestId}${p.index}`));
    
    // Get problems from Codeforces API
    const response = await axios.get(`${process.env.CODEFORCES_API_URL}/problemset.problems`);
    
    if (response.data.status === 'OK') {
      const problems = response.data.result.problems;
      
      // Filter problems that neither player has solved
      const availableProblems = problems.filter(problem => {
        const problemKey = `${problem.contestId}${problem.index}`;
        return !player1Solved.has(problemKey) && !player2Solved.has(problemKey) && problem.rating;
      });

      // Select one problem for each desired rating
      const desiredRatings = [800, 1200, 1400, 1600, 1800];
      const selectedProblems = [];
      for (const rating of desiredRatings) {
        // Find all available problems with this rating
        const candidates = availableProblems.filter(p => p.rating === rating);
        if (candidates.length > 0) {
          // Pick a random problem from the candidates
          const chosen = candidates[Math.floor(Math.random() * candidates.length)];
          selectedProblems.push({
            contestId: chosen.contestId,
            index: chosen.index,
            name: chosen.name,
            rating: chosen.rating,
            solvedBy: null,
            solvedAt: null,
            submissions: []
          });
        }
      }
      // If not enough, fill with random other available problems (different ratings)
      if (selectedProblems.length < 5) {
        const usedKeys = new Set(selectedProblems.map(p => `${p.contestId}${p.index}`));
        const remaining = availableProblems.filter(p => !usedKeys.has(`${p.contestId}${p.index}`));
        while (selectedProblems.length < 5 && remaining.length > 0) {
          const idx = Math.floor(Math.random() * remaining.length);
          const chosen = remaining.splice(idx, 1)[0];
          selectedProblems.push({
            contestId: chosen.contestId,
            index: chosen.index,
            name: chosen.name,
            rating: chosen.rating,
            solvedBy: null,
            solvedAt: null,
            submissions: []
          });
        }
      }
      return selectedProblems;
    }
    
    return [];
  } catch (error) {
    console.error('Error generating problems:', error);
    return [];
  }
}


module.exports = router; 