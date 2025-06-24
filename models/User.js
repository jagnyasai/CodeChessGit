const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  avatar: {
    type: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  codeforcesHandle: {
    type: String,
    unique: true,
    sparse: true
  },
  rating: {
    type: Number,
    default: 0
  },
  solvedProblems: [{
    contestId: Number,
    index: String,
    name: String,
    rating: Number,
    solvedAt: Date
  }],
  gamesPlayed: {
    type: Number,
    default: 0
  },
  gamesWon: {
    type: Number,
    default: 0
  },
  currentGame: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game'
  },
  preferences: {
    language: {
      type: String,
      default: 'cpp'
    },
    theme: {
      type: String,
      default: 'dark'
    }
  },
  achievements: [{
    name: String,
    description: String,
    earnedAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema); 