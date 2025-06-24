const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  player1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  player2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  mode: {
    type: String,
    enum: ['online', 'friend'],
    required: true
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed', 'cancelled'],
    default: 'waiting'
  },
  problems: [{
    contestId: Number,
    index: String,
    name: String,
    rating: Number,
    solvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    solvedAt: Date,
    submissions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      code: String,
      language: String,
      verdict: String,
      submittedAt: Date,
      executionTime: Number,
      memoryUsed: Number
    }]
  }],
  currentProblemIndex: {
    type: Number,
    default: 0
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  startTime: Date,
  endTime: Date,
  duration: Number, // in minutes
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Game', GameSchema); 