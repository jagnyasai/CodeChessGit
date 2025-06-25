// Socket Controller for Real-time Communication
class SocketController {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.init();
    }

    init() {
        this.connect();
        this.initEventListeners();
    }

    connect() {
        try {
            this.socket = io();
            this.setupSocketEvents();
        } catch (error) {
            console.error('Failed to connect to socket server:', error);
            this.scheduleReconnect();
        }
    }

    setupSocketEvents() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('Connected to socket server');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Join game room if in a game
            if (window.gameController && window.gameController.currentGame) {
                this.joinGame(window.gameController.currentGame._id);
            }

            // Join user-specific room for direct messaging
            const currentUser = window.authController?.getCurrentUser?.();
            if (currentUser && currentUser._id) {
                this.socket.emit('join-user-room', { userId: currentUser._id });
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from socket server');
            this.isConnected = false;
            this.scheduleReconnect();
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            this.isConnected = false;
        });

        // Game-specific events
        this.socket.on('opponent-found', (data) => {
            this.handleOpponentFound(data);
        });

        this.socket.on('game-started', (data) => {
            this.handleGameStarted(data);
        });

        this.socket.on('opponent-submitted', (data) => {
            this.handleOpponentSubmitted(data);
        });

        this.socket.on('problem-solved', (data) => {
            this.handleProblemSolved(data);
        });

        this.socket.on('game-ended', (data) => {
            this.handleGameEnded(data);
        });

        this.socket.on('chat-message', (data) => {
            this.handleChatMessage(data);
        });

        this.socket.on('opponent-typing', (data) => {
            this.handleOpponentTyping(data);
        });

        this.socket.on('opponent-disconnected', (data) => {
            this.handleOpponentDisconnected(data);
        });

        this.socket.on('opponent-reconnected', (data) => {
            this.handleOpponentReconnected(data);
        });

        this.socket.on('game-update', (data) => {
            this.handleGameUpdate(data);
        });

        // Ping/pong for connection health
        this.socket.on('pong', () => {
            // Connection is healthy
        });

        // Listen for friend game request
        this.socket.on('game-request', (data) => {
            this.handleGameRequest(data);
        });
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        setTimeout(() => {
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.connect();
        }, delay);
    }

    initEventListeners() {
        // Listen for authentication events
        window.addEventListener('userAuthenticated', (event) => {
            // User authenticated, ensure socket connection
            if (!this.isConnected) {
                this.connect();
            }
        });

        window.addEventListener('userUnauthenticated', () => {
            // User logged out, disconnect socket
            if (this.socket) {
                this.socket.disconnect();
            }
        });
    }

    // Socket event handlers
    handleOpponentFound(data) {
        if (window.gameController) {
            window.gameController.showNotification(`Opponent found: ${data.opponent.name}`, 'success');
        }
    }

    handleGameStarted(data) {
        if (window.gameController) {
            window.gameController.showNotification('Game started!', 'success');
        }
    }

    handleOpponentSubmitted(data) {
        if (window.gameController) {
            window.gameController.showNotification(
                `Opponent submitted solution for problem ${data.problemIndex + 1}`, 
                'info'
            );
        }
    }

    handleProblemSolved(data) {
        const currentUser = window.authController.getCurrentUser();
        const isOwnSolution = data.solvedBy === currentUser?.id;
        
        const message = isOwnSolution ? 
            `You solved problem ${data.problemIndex + 1}!` : 
            `Opponent solved problem ${data.problemIndex + 1}`;
        
        if (window.gameController) {
            window.gameController.showNotification(
                message, 
                isOwnSolution ? 'success' : 'warning'
            );
        }
    }

    handleGameEnded(data) {
        const currentUser = window.authController.getCurrentUser();
        const isWinner = data.winner === currentUser?.id;
        
        if (window.gameController) {
            window.gameController.handleGameEnd({
                winner: data.winner,
                won: isWinner,
                duration: 0, // Will be updated from game data
                solvedCount: 0 // Will be updated from game data
            });
        }
    }

    handleChatMessage(data) {
        if (window.gameController) {
            window.gameController.addChatMessage(data);
        }
    }

    handleOpponentTyping(data) {
        if (window.gameController) {
            window.gameController.showTypingIndicator(data.isTyping);
        }
    }

    handleOpponentDisconnected(data) {
        if (window.gameController) {
            window.gameController.showNotification('Opponent disconnected', 'warning');
        }
    }

    handleOpponentReconnected(data) {
        if (window.gameController) {
            window.gameController.showNotification('Opponent reconnected', 'info');
        }
    }

    handleGameUpdate(data) {
        if (window.gameController) {
            // Update game state
            window.gameController.currentGame = data;
            window.gameController.updateGameUI();
        }
    }

    handleGameRequest(data) {
        // Show a modal to accept/reject the game request
        const modal = document.getElementById('game-request-modal');
        const overlay = document.getElementById('modal-overlay');
        const acceptBtn = document.getElementById('accept-game-request-btn');
        const rejectBtn = document.getElementById('reject-game-request-btn');
        const message = document.getElementById('game-request-message');

        if (modal && overlay && acceptBtn && rejectBtn && message) {
            message.textContent = `${data.senderName} invited you to a game!`;
            overlay.classList.add('active');
            modal.style.display = 'block';

            // Remove previous listeners
            const newAcceptBtn = acceptBtn.cloneNode(true);
            acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);
            const newRejectBtn = rejectBtn.cloneNode(true);
            rejectBtn.parentNode.replaceChild(newRejectBtn, rejectBtn);

            newAcceptBtn.addEventListener('click', () => {
                overlay.classList.remove('active');
                modal.style.display = 'none';
                // Join the game and navigate
                if (window.socketController && window.socketController.joinGame) {
                    window.socketController.joinGame(data.gameId);
                }
                if (window.app && window.app.navigateToPage) {
                    window.app.navigateToPage('game');
                }
            });

            newRejectBtn.addEventListener('click', () => {
                overlay.classList.remove('active');
                modal.style.display = 'none';
                // Optionally, emit a reject event
                if (window.socketController && window.socketController.getSocket) {
                    const socket = window.socketController.getSocket();
                    if (socket) {
                        socket.emit('game-request-reject', {
                            senderId: data.senderId,
                            gameId: data.gameId
                        });
                    }
                }
            });
        } else {
            // Fallback: just show a notification
            if (window.dashboardController) {
                window.dashboardController.showNotification(`${data.senderName} invited you to a game!`, 'info');
            }
        }
    }

    // Socket utility methods
    joinGame(gameId) {
        if (this.socket && this.isConnected) {
            const currentUser = window.authController.getCurrentUser();
            this.socket.emit('join-game', {
                gameId: gameId,
                userId: currentUser?.id
            });
        }
    }

    leaveGame(gameId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('leave-game', { gameId: gameId });
        }
    }

    sendChatMessage(gameId, message) {
        if (this.socket && this.isConnected) {
            const currentUser = window.authController.getCurrentUser();
            this.socket.emit('chat-message', {
                gameId: gameId,
                userId: currentUser?.id,
                message: message,
                userName: currentUser?.name
            });
        }
    }

    sendTypingIndicator(gameId, isTyping) {
        if (this.socket && this.isConnected) {
            const currentUser = window.authController.getCurrentUser();
            this.socket.emit('typing', {
                gameId: gameId,
                userId: currentUser?.id,
                isTyping: isTyping
            });
        }
    }

    sendCodeSubmission(gameId, code, language, problemIndex) {
        if (this.socket && this.isConnected) {
            const currentUser = window.authController.getCurrentUser();
            this.socket.emit('submit-code', {
                gameId: gameId,
                code: code,
                language: language,
                problemIndex: problemIndex,
                userId: currentUser?.id
            });
        }
    }

    sendProblemSolved(gameId, problemIndex, problemName) {
        if (this.socket && this.isConnected) {
            const currentUser = window.authController.getCurrentUser();
            this.socket.emit('problem-solved', {
                gameId: gameId,
                problemIndex: problemIndex,
                userId: currentUser?.id,
                problemName: problemName
            });
        }
    }

    sendGameWon(gameId) {
        if (this.socket && this.isConnected) {
            const currentUser = window.authController.getCurrentUser();
            this.socket.emit('game-won', {
                gameId: gameId,
                winnerId: currentUser?.id,
                winnerName: currentUser?.name
            });
        }
    }

    // Connection health monitoring
    startHealthCheck() {
        if (this.socket && this.isConnected) {
            this.socket.emit('ping');
        }
    }

    // Public methods for other controllers
    isSocketConnected() {
        return this.isConnected;
    }

    getSocket() {
        return this.socket;
    }

    // Cleanup
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }
}

// Initialize socket controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.socketController = new SocketController();
    if (window.app) {
        window.app.socket = window.socketController.socketController?.socket || window.socketController.socket;
    }
}); 