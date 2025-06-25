// Leaderboard Controller
class LeaderboardController {
    constructor() {
        this.leaderboardData = [];
        this.currentFilter = 'rating';
        this.init();
    }

    init() {
        this.loadLeaderboard();
        this.initEventListeners();
    }

    initEventListeners() {
        const filterSelect = document.getElementById('leaderboard-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.loadLeaderboard();
            });
        }
    }

    async loadLeaderboard() {
        try {
            const response = await fetch('/api/users/leaderboard');
            this.leaderboardData = await response.json();
            this.renderLeaderboard();
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            this.showNotification('Failed to load leaderboard', 'error');
        }
    }

    renderLeaderboard() {
        const container = document.getElementById('leaderboard-table');
        if (!container) return;

        // Sort data based on current filter
        const sortedData = [...this.leaderboardData].sort((a, b) => {
            switch (this.currentFilter) {
                case 'rating':
                    return b.rating - a.rating;
                case 'games':
                    return b.gamesWon - a.gamesWon;
                case 'solved':
                    return (b.solvedProblems?.length || 0) - (a.solvedProblems?.length || 0);
                default:
                    return b.rating - a.rating;
            }
        });

        // Create header
        const header = `
            <div class="leaderboard-row">
                <div class="rank">Rank</div>
                <div class="user-info-leaderboard">User</div>
                <div class="rating">Rating</div>
                <div class="games">Games Won</div>
                <div class="solved">Solved</div>
            </div>
        `;

        // Create rows
        const rows = sortedData.map((user, index) => {
            const rank = index + 1;
            const winRate = user.gamesPlayed > 0 ? 
                ((user.gamesWon / user.gamesPlayed) * 100).toFixed(1) : 0;
            
            return `
                <div class="leaderboard-row" onclick="window.leaderboardController.showUserProfile('${user._id}')">
                    <div class="rank">${rank}</div>
                    <div class="user-info-leaderboard">
                        <img src="${user.avatar || '/default-avatar.png'}" alt="${user.name}" class="user-avatar-leaderboard">
                        <div class="user-details">
                            <div class="user-name-leaderboard">${user.name}</div>
                            <div class="user-handle">${user.codeforcesHandle || 'No handle'}</div>
                        </div>
                    </div>
                    <div class="rating">${user.rating}</div>
                    <div class="games">${user.gamesWon}/${user.gamesPlayed} (${winRate}%)</div>
                    <div class="solved">${user.solvedProblems?.length || 0}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = header + rows;
    }

    async showUserProfile(userId) {
        try {
            const response = await fetch(`/api/users/stats/${userId}`);
            const userStats = await response.json();
            
            this.showUserProfileModal(userStats);
        } catch (error) {
            console.error('Error loading user stats:', error);
            this.showNotification('Failed to load user profile', 'error');
        }
    }

    showUserProfileModal(userStats) {
        // Create modal content
        const modalContent = `
            <div class="user-profile-modal">
                <div class="user-profile-header">
                    <img src="${userStats.avatar || '/default-avatar.png'}" alt="${userStats.name}" class="user-profile-avatar">
                    <div class="user-profile-info">
                        <h3>${userStats.name}</h3>
                        <p class="user-profile-handle">@${userStats.handle}</p>
                        <p class="user-profile-rating">Rating: ${userStats.rating}</p>
                    </div>
                </div>
                <div class="user-profile-stats">
                    <div class="stat-item">
                        <span class="stat-label">Problems Solved</span>
                        <span class="stat-value">${userStats.solvedCount}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Games Played</span>
                        <span class="stat-value">${userStats.gamesPlayed}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Games Won</span>
                        <span class="stat-value">${userStats.gamesWon}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Win Rate</span>
                        <span class="stat-value">${userStats.winRate}%</span>
                    </div>
                </div>
                ${userStats.achievements && userStats.achievements.length > 0 ? `
                    <div class="user-profile-achievements">
                        <h4>Achievements</h4>
                        <div class="achievements-list">
                            ${userStats.achievements.map(achievement => `
                                <div class="achievement-item">
                                    <i class="fas fa-trophy"></i>
                                    <span>${achievement.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        // Show modal
        this.showModal('User Profile', modalContent);
    }

    showModal(title, content) {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-content">
                ${content}
            </div>
        `;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.appendChild(modal);

        // Add to page
        document.body.appendChild(overlay);

        // Handle close
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
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
}

// Initialize leaderboard controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.leaderboardController = new LeaderboardController();
}); 