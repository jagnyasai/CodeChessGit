// Contests Controller
class ContestsController {
    constructor() {
        this.contests = [];
        this.currentTab = 'upcoming';
        this.init();
    }

    init() {
        this.loadContests();
        this.initEventListeners();
    }

    initEventListeners() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
    }

    switchTab(tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // Load contests for the selected tab
        this.loadContests();
    }

    async loadContests() {
        try {
            const endpoint = this.currentTab === 'upcoming' ? 'upcoming' : 'recent';
            const response = await fetch(`/api/contests/${endpoint}`);
            this.contests = await response.json();
            this.renderContests();
        } catch (error) {
            console.error('Error loading contests:', error);
            this.showNotification('Failed to load contests', 'error');
        }
    }

    renderContests() {
        const container = document.getElementById('contests-list');
        if (!container) return;

        if (this.contests.length === 0) {
            container.innerHTML = `
                <div class="no-contests">
                    <i class="fas fa-calendar-times"></i>
                    <p>No ${this.currentTab} contests found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.contests.map((contest, idx) => {
            const startTime = new Date(contest.startTime);
            const duration = Math.floor(contest.duration / 60); // Convert to minutes
            const featuredClass = idx === 0 ? 'featured' : '';
            let iconHtml = '';
            let iconType = '';
            let iconTitle = '';
            if (this.currentTab === 'recent') {
                iconHtml = `<i class=\"fas fa-video contest-feature-icon\" title=\"PCD feature coming soon!\" data-feature=\"pcd\" style=\"color:var(--primary);font-size:1.3em;margin-right:0.7rem;cursor:pointer;\"></i>`;
                iconType = 'pcd';
                iconTitle = 'PCD feature coming soon!';
            } else {
                iconHtml = `<i class=\"fas fa-bell contest-feature-icon\" title=\"Alarm feature coming soon!\" data-feature=\"alarm\" style=\"color:var(--accent);font-size:1.3em;margin-right:0.7rem;cursor:pointer;\"></i>`;
                iconType = 'alarm';
                iconTitle = 'Alarm feature coming soon!';
            }
            return `
                <div class=\"contest-card ${featuredClass}\" data-idx=\"${idx}\">
                    <div class=\"contest-header\">
                        <div style=\"display:flex;align-items:center;gap:0.5rem;\">
                            ${iconHtml}
                            <div style=\"flex:1;\">
                                <div class=\"contest-title\" title=\"${contest.name}\">${contest.name}</div>
                                <div class=\"contest-type\">${contest.type}</div>
                            </div>
                        </div>
                    </div>
                    <div class=\"contest-meta\">
                        <span>
                            <i class=\"fas fa-clock\"></i>
                            ${this.formatDate(startTime)}
                        </span>
                        <span>
                            <i class=\"fas fa-hourglass-half\"></i>
                            ${duration} minutes
                        </span>
                        <span>
                            <i class=\"fas fa-external-link-alt\"></i>
                            <a href=\"${contest.url}\" target=\"_blank\">View on Codeforces</a>
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        // Add event listeners for the icons and contest cards
        setTimeout(() => {
            document.querySelectorAll('.contest-feature-icon').forEach(icon => {
                icon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const feature = icon.getAttribute('data-feature');
                    if (feature === 'pcd') {
                        this.showModal('Coming Soon', 'PCD feature coming soon!');
                    } else {
                        this.showModal('Coming Soon', 'Alarm feature coming soon!');
                    }
                });
            });
            document.querySelectorAll('.contest-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    // Only trigger if not clicking the icon
                    if (!e.target.classList.contains('contest-feature-icon')) {
                        const idx = card.getAttribute('data-idx');
                        const contest = this.contests[idx];
                        this.showContestDetails(contest.id);
                    }
                });
            });
        }, 0);
    }

    async showContestDetails(contestId) {
        try {
            const response = await fetch(`/api/contests/${contestId}`);
            const contest = await response.json();
            
            this.showContestModal(contest);
        } catch (error) {
            console.error('Error loading contest details:', error);
            this.showNotification('Failed to load contest details', 'error');
        }
    }

    showContestModal(contest) {
        const startTime = new Date(contest.startTime);
        const duration = Math.floor(contest.duration / 60);
        
        const modalContent = `
            <div class="contest-details-modal">
                <div class="contest-details-header">
                    <h3>${contest.name}</h3>
                    <div class="contest-details-meta">
                        <span class="contest-type-badge">${contest.type}</span>
                        <span class="contest-phase-badge">${contest.phase}</span>
                    </div>
                </div>
                <div class="contest-details-info">
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <span>Start Time: ${this.formatDate(startTime)}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-hourglass-half"></i>
                        <span>Duration: ${duration} minutes</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-external-link-alt"></i>
                        <a href="${contest.url}" target="_blank">View on Codeforces</a>
                    </div>
                </div>
                ${contest.problems && contest.problems.length > 0 ? `
                    <div class="contest-problems">
                        <h4>Problems (${contest.problems.length})</h4>
                        <div class="problems-list">
                            ${contest.problems.map(problem => `
                                <div class="problem-item">
                                    <span class="problem-index">${problem.index}</span>
                                    <span class="problem-name">${problem.name}</span>
                                    <span class="problem-rating">${problem.rating}</span>
                                    <a href="${contest.url}/problem/${problem.index}" target="_blank" class="problem-link">
                                        <i class="fas fa-external-link-alt"></i>
                                    </a>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                <div class="contest-actions">
                    <a href="${contest.url}" target="_blank" class="btn btn-primary">
                        <i class="fas fa-external-link-alt"></i>
                        Go to Contest
                    </a>
                    <button class="btn btn-secondary" onclick="window.contestsController.loadContestStandings('${contest.id}')">
                        <i class="fas fa-list-ol"></i>
                        View Standings
                    </button>
                </div>
            </div>
        `;

        this.showModal('Contest Details', modalContent);
    }

    async loadContestStandings(contestId) {
        try {
            const response = await fetch(`/api/contests/${contestId}/standings?count=20`);
            const data = await response.json();
            
            this.showStandingsModal(data);
        } catch (error) {
            console.error('Error loading standings:', error);
            this.showNotification('Failed to load standings', 'error');
        }
    }

    showStandingsModal(data) {
        const modalContent = `
            <div class="standings-modal">
                <div class="standings-header">
                    <h3>${data.contest.name} - Standings</h3>
                </div>
                <div class="standings-table">
                    <div class="standings-header-row">
                        <div class="rank-col">Rank</div>
                        <div class="user-col">User</div>
                        <div class="points-col">Points</div>
                        <div class="penalty-col">Penalty</div>
                    </div>
                    ${data.standings.map(row => `
                        <div class="standings-row">
                            <div class="rank-col">${row.rank}</div>
                            <div class="user-col">
                                ${row.party.members.map(member => member.handle).join(', ')}
                            </div>
                            <div class="points-col">${row.points}</div>
                            <div class="penalty-col">${row.penalty}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.showModal('Contest Standings', modalContent);
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

    formatDate(date) {
        const now = new Date();
        const diff = date - now;
        
        if (diff > 0) {
            // Future date
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            if (days > 0) {
                return `In ${days} day${days > 1 ? 's' : ''}`;
            } else if (hours > 0) {
                return `In ${hours} hour${hours > 1 ? 's' : ''}`;
            } else {
                return 'Starting soon';
            }
        } else {
            // Past date
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
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

// Initialize contests controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.contestsController = new ContestsController();
}); 