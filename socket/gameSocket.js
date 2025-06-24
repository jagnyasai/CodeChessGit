const Game = require('../models/Game');
const User = require('../models/User');

module.exports = function(io) {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join game room
    socket.on('join-game', async (data) => {
      try {
        const { gameId, userId } = data;
        
        if (gameId) {
          socket.join(`game-${gameId}`);
          socket.gameId = gameId;
          socket.userId = userId;
          
          console.log(`User ${userId} joined game ${gameId}`);
        }
      } catch (error) {
        console.error('Error joining game:', error);
      }
    });

    // Leave game room
    socket.on('leave-game', async (data) => {
      try {
        const { gameId } = data;
        
        if (gameId) {
          socket.leave(`game-${gameId}`);
          socket.gameId = null;
          
          console.log(`User left game ${gameId}`);
        }
      } catch (error) {
        console.error('Error leaving game:', error);
      }
    });

    // Handle code submission
    socket.on('submit-code', async (data) => {
      try {
        const { gameId, code, language, problemIndex, userId } = data;
        
        // Emit to all players in the game
        socket.to(`game-${gameId}`).emit('opponent-submitted', {
          problemIndex,
          language,
          timestamp: new Date()
        });
        
        console.log(`User ${userId} submitted code for problem ${problemIndex} in game ${gameId}`);
      } catch (error) {
        console.error('Error handling code submission:', error);
      }
    });

    // Handle problem solved
    socket.on('problem-solved', async (data) => {
      try {
        const { gameId, problemIndex, userId, problemName } = data;
        
        // Emit to all players in the game
        io.to(`game-${gameId}`).emit('problem-solved', {
          problemIndex,
          problemName,
          solvedBy: userId,
          timestamp: new Date()
        });
        
        console.log(`Problem ${problemIndex} solved by user ${userId} in game ${gameId}`);
      } catch (error) {
        console.error('Error handling problem solved:', error);
      }
    });

    // Handle game won
    socket.on('game-won', async (data) => {
      try {
        const { gameId, winnerId, winnerName } = data;
        
        // Emit to all players in the game
        io.to(`game-${gameId}`).emit('game-ended', {
          winner: winnerId,
          winnerName,
          timestamp: new Date()
        });
        
        console.log(`Game ${gameId} won by ${winnerName}`);
      } catch (error) {
        console.error('Error handling game won:', error);
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      try {
        const { gameId, userId, isTyping } = data;
        
        socket.to(`game-${gameId}`).emit('opponent-typing', {
          userId,
          isTyping
        });
      } catch (error) {
        console.error('Error handling typing indicator:', error);
      }
    });

    // Handle chat message
    socket.on('chat-message', (data) => {
      try {
        const { gameId, userId, message, userName } = data;
        
        io.to(`game-${gameId}`).emit('chat-message', {
          userId,
          userName,
          message,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error handling chat message:', error);
      }
    });

    // Handle opponent found
    socket.on('opponent-found', (data) => {
      try {
        const { gameId, opponent } = data;
        
        io.to(`game-${gameId}`).emit('opponent-found', {
          opponent,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error handling opponent found:', error);
      }
    });

    // Handle game start
    socket.on('game-start', (data) => {
      try {
        const { gameId, problems } = data;
        
        io.to(`game-${gameId}`).emit('game-started', {
          problems,
          startTime: new Date()
        });
      } catch (error) {
        console.error('Error handling game start:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      try {
        console.log('User disconnected:', socket.id);
        
        // If user was in a game, notify opponent
        if (socket.gameId && socket.userId) {
          socket.to(`game-${socket.gameId}`).emit('opponent-disconnected', {
            userId: socket.userId,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });

    // Handle reconnection
    socket.on('reconnect', async (data) => {
      try {
        const { gameId, userId } = data;
        
        if (gameId) {
          socket.join(`game-${gameId}`);
          socket.gameId = gameId;
          socket.userId = userId;
          
          socket.to(`game-${gameId}`).emit('opponent-reconnected', {
            userId,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error handling reconnection:', error);
      }
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Handle game request
    socket.on('game-request', async (data) => {
      try {
        // Send to the opponent
        io.to(`user-${data.receiverId}`).emit('game-request', {
          gameId: data.gameId,
          senderId: data.senderId,
          senderName: data.senderName
        });
      } catch (error) {
        console.error('Error handling game request:', error);
      }
    });

    // Handle game request accept
    socket.on('game-request-accept', async (data) => {
      try {
        // Notify both users to start the game and redirect
        io.to(`game-${data.gameId}`).emit('game-request-accepted', {
          gameId: data.gameId,
          problemUrl: data.problemUrl,
          contestId: data.contestId,
          index: data.index
        });
      } catch (error) {
        console.error('Error handling game request accept:', error);
      }
    });

    // Handle game request reject
    socket.on('game-request-reject', async (data) => {
      try {
        // Notify the sender
        io.to(`user-${data.senderId}`).emit('game-request-rejected', {
          gameId: data.gameId
        });
      } catch (error) {
        console.error('Error handling game request reject:', error);
      }
    });

    // Join user-specific room for direct messaging
    socket.on('join-user-room', (data) => {
      if (data && data.userId) {
        socket.join(`user-${data.userId}`);
        console.log(`Socket ${socket.id} joined user room user-${data.userId}`);
      }
    });
  });

  // Broadcast game updates to all connected clients
  io.broadcastGameUpdate = (gameId, update) => {
    io.to(`game-${gameId}`).emit('game-update', update);
  };

  // Broadcast to specific user
  io.broadcastToUser = (userId, event, data) => {
    io.emit(event, { userId, ...data });
  };
}; 