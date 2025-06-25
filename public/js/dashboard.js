// Dashboard Controller
class DashboardController {
    constructor() {
        this.currentUser = null;
        this.suggestedProblems = [];
        this.init();
    }

    init() {
        this.loadUserData();
        this.initEventListeners();
        this.loadSuggestedProblems();
        this.loadRecentActivity();

        // Forcefully enter the game room if user has a current game
        this.checkAndEnterCurrentGame();
    }

    async loadUserData() {
        try {
            const response = await fetch('/api/users/profile');
            const userData = await response.json();
            this.currentUser = userData;
            this.updateUserStats(userData);
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    updateUserStats(userData) {
        // Update rating
        const ratingElement = document.getElementById('user-rating-value');
        if (ratingElement) {
            ratingElement.textContent = userData.rating || 0;
        }

        // Update solved count
        const solvedElement = document.getElementById('solved-count');
        if (solvedElement) {
            solvedElement.textContent = userData.solvedProblems?.length || 0;
        }

        // Update games played
        const gamesElement = document.getElementById('games-played');
        if (gamesElement) {
            gamesElement.textContent = userData.gamesPlayed || 0;
        }

        // Update win rate
        const winRateElement = document.getElementById('win-rate');
        if (winRateElement) {
            const winRate = userData.gamesPlayed > 0 ? 
                ((userData.gamesWon || 0) / userData.gamesPlayed * 100).toFixed(1) : 0;
            winRateElement.textContent = `${winRate}%`;
        }
    }

    initEventListeners() {
        // Find online opponent button
        const findOnlineBtn = document.getElementById('find-online-btn');
        if (findOnlineBtn) {
            findOnlineBtn.addEventListener('click', () => {
                this.findOnlineOpponent();
            });
        }

        // Play with friend button
        const playFriendBtn = document.getElementById('play-friend-btn');
        if (playFriendBtn) {
            playFriendBtn.addEventListener('click', () => {
                console.log('Play with Friend button clicked');
                this.showFriendModal();
            });
        }

        // Practice problems button
        const practiceBtn = document.getElementById('practice-btn');
        if (practiceBtn) {
            practiceBtn.addEventListener('click', () => {
                window.app.navigateToPage('problems');
            });
        }

        // Cancel All Games button
        const cancelAllBtn = document.getElementById('cancel-all-btn');
        if (cancelAllBtn) {
            cancelAllBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to cancel all your games?')) {
                    cancelAllBtn.disabled = true;
                    const originalText = cancelAllBtn.textContent;
                    cancelAllBtn.textContent = 'Cancelling...';
                    try {
                        const response = await fetch('/api/games/cancel-all', { method: 'POST' });
                        const data = await response.json();
                        if (data.success) {
                            this.showNotification('All games cancelled!', 'success');
                            setTimeout(() => {
                                const btn = document.getElementById('cancel-all-btn');
                                if (btn) {
                                    btn.disabled = false;
                                    btn.textContent = 'Cancel All Games';
                                }
                            }, 100);
                            this.loadUserData();
                            this.loadRecentActivity();
                        } else {
                            this.showNotification(data.error || 'Failed to cancel games', 'error');
                        }
                    } catch (error) {
                        console.error('Error cancelling games:', error);
                        this.showNotification('Failed to cancel games', 'error');
                    }
                }
            });
        }
    }

    async findOnlineOpponent() {
        if (!window.authController || !window.authController.isVerified()) {
            this.showNotification('Please verify your Codeforces handle first', 'error');
            return;
        }

        const findBtn = document.getElementById('find-online-btn');
        if (!findBtn) {
            this.showNotification('Error: Find button not found', 'error');
            return;
        }

        let originalText = findBtn.textContent;
        try {
            findBtn.textContent = 'Finding opponent...';
            findBtn.disabled = true;

            const response = await fetch('/api/games/find-online', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                if (data.waiting) {
                    this.showNotification('Waiting for opponent...', 'info');
                    // Start polling for opponent
                    this.pollForOpponent(data.game._id);
                } else {
                    this.showNotification(`Opponent found: ${data.opponent.name}`, 'success');
                    // Navigate to game
                    window.app.navigateToPage('game');
                    if (window.gameController) {
                        window.gameController.initGame(data.game);
                    }
                }
            } else {
                this.showNotification(data.error || 'Failed to find opponent', 'error');
            }
        } catch (error) {
            console.error('Error finding opponent:', error);
            this.showNotification('Failed to find opponent', 'error');
        } finally {
            if (findBtn) {
                findBtn.textContent = originalText;
                findBtn.disabled = false;
            }
        }
    }

    async pollForOpponent(gameId) {
        const maxAttempts = 60; // 5 minutes
        let attempts = 0;

        const poll = async () => {
            try {
                const response = await fetch(`/api/games/current`);
                const data = await response.json();

                if (data.game && data.game.status === 'active') {
                    this.showNotification('Opponent found! Game starting...', 'success');
                    window.app.navigateToPage('game');
                    if (window.gameController) {
                        window.gameController.initGame(data.game);
                    }
                    return;
                }

                attempts++;
                if (attempts >= maxAttempts) {
                    this.showNotification('No opponent found. Please try again.', 'warning');
                    return;
                }

                setTimeout(poll, 5000); // Poll every 5 seconds
            } catch (error) {
                console.error('Error polling for opponent:', error);
            }
        };

        poll();
    }

    showFriendModal() {
        console.log('showFriendModal called');
        if (!window.authController.isVerified()) {
            window.authController.requireVerification(() => {
                this.showFriendModal();
            });
            return;
        }
        // Use the app's showFriendModal method instead of duplicating logic
        window.app.showFriendModal();
    }

    async loadSuggestedProblems() {
        try {
            const rating = this.currentUser?.rating || 1200;
            const response = await fetch(`/api/problems/suggested?rating=${rating}`);
            this.suggestedProblems = await response.json();
            this.renderSuggestedProblems();
        } catch (error) {
            console.error('Error loading suggested problems:', error);
        }
    }

    renderSuggestedProblems() {
        const container = document.getElementById('suggested-problems');
        if (!container) return;

        container.innerHTML = this.suggestedProblems.map(problem => `
            <div class="problem-card" onclick="window.app.navigateToPage('problems')">
                <h4>${problem.name}</h4>
                <div class="problem-rating">Rating: ${problem.rating}</div>
                <div class="problem-tags">
                    ${problem.tags?.slice(0, 3).map(tag => 
                        `<span class="problem-tag">${tag}</span>`
                    ).join('') || ''}
                </div>
            </div>
        `).join('');
    }

    async loadRecentActivity() {
        try {
            const response = await fetch('/api/games/history');
            if (!response.ok) {
                // Not logged in or other error
                this.renderRecentActivity([]);
                return;
            }
            const games = await response.json();
            if (!Array.isArray(games)) {
                this.renderRecentActivity([]);
                return;
            }
            this.renderRecentActivity(games);
        } catch (error) {
            this.renderRecentActivity([]);
            console.error('Error loading recent activity:', error);
        }
    }

    renderRecentActivity(games) {
        const container = document.getElementById('activity-list');
        if (!container) return;

        if (!games || games.length === 0) {
            container.innerHTML = '<p>Please log in to see your recent activity.</p>';
            return;
        }

        container.innerHTML = games.slice(0, 5).map(game => {
            const isWinner = game.winner === this.currentUser?.id;
            const opponent = game.player1._id === this.currentUser?.id ? 
                game.player2 : game.player1;
            
            return `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas ${isWinner ? 'fa-trophy' : 'fa-gamepad'}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">
                            ${isWinner ? 'Won' : 'Lost'} against ${opponent.name}
                        </div>
                        <div class="activity-time">
                            ${this.formatTime(game.createdAt)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    async checkAndEnterCurrentGame() {
        try {
            const response = await fetch('/api/games/current');
            const data = await response.json();
            if (data.game && data.game.status === 'active') {
                window.app.navigateToPage('game');
                if (window.gameController) {
                    window.gameController.initGame(data.game);
                }
            }
        } catch (error) {
            // Ignore errors
        }
    }
}

// Initialize dashboard controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardController = new DashboardController();

    // Listen for navigation to the Past Games page
    function renderPastGamesPage() {
        const page = document.getElementById('past-games-page');
        if (!page || !page.classList.contains('active')) return;

        const container = document.getElementById('past-games-list');
        container.innerHTML = 'Loading...';

        fetch('/api/games/history')
            .then(res => res.json())
            .then(games => {
                if (!Array.isArray(games) || games.length === 0) {
                    container.innerHTML = '<p>No past games found.</p>';
                    return;
                }
                const you = window.authController.getCurrentUser();
                container.innerHTML = games.map(game => {
                    const isWinner = game.winner && (game.winner._id === you.id || game.winner === you.id);
                    const isTie = game.winner === null;
                    const opponent = (game.player1._id === you.id || game.player1 === you.id) ? game.player2 : game.player1;
                    const resultClass = isTie ? 'tie' : (isWinner ? 'win' : 'loss');
                    return `
                        <div class="history-item ${resultClass}">
                            <div class="history-icon">
                                <i class="fas ${isTie ? 'fa-handshake' : (isWinner ? 'fa-trophy' : 'fa-gamepad')}"></i>
                            </div>
                            <div>
                                <div><strong>${isTie ? 'Tie' : (isWinner ? 'Won' : 'Lost')}</strong> vs ${opponent.name}</div>
                                <div class="history-date">${new Date(game.createdAt).toLocaleString()}</div>
                            </div>
                        </div>
                    `;
                }).join('');
            })
            .catch(() => {
                container.innerHTML = '<p>Error loading past games.</p>';
            });
    }

    // Hook into SPA navigation
    document.querySelectorAll('.nav-link[data-page="past-games"]').forEach(link => {
        link.addEventListener('click', () => {
            setTimeout(renderPastGamesPage, 100); // Wait for page to become active
        });
    });

    // Also render if the page is loaded directly
    if (document.getElementById('past-games-page')?.classList.contains('active')) {
        renderPastGamesPage();
    }
}); 