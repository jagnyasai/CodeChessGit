// Problems Controller
class ProblemsController {
    constructor() {
        this.problems = [];
        this.currentPage = 1;
        this.problemsPerPage = 20;
        this.filters = {
            search: '',
            minRating: '',
            maxRating: '',
            tags: ''
        };
        this.init();
    }

    init() {
        this.loadProblems();
        this.initEventListeners();
    }

    initEventListeners() {
        // Search input
        const searchInput = document.getElementById('problem-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.debounce(() => this.loadProblems(), 500);
            });
        }

        // Rating filter
        const ratingFilter = document.getElementById('rating-filter');
        if (ratingFilter) {
            ratingFilter.addEventListener('change', (e) => {
                const value = e.target.value;
                if (value) {
                    const [min, max] = value.split('-');
                    this.filters.minRating = min;
                    this.filters.maxRating = max === '+' ? '' : max;
                } else {
                    this.filters.minRating = '';
                    this.filters.maxRating = '';
                }
                this.loadProblems();
            });
        }

        // Tag filter
        const tagFilter = document.getElementById('tag-filter');
        if (tagFilter) {
            tagFilter.addEventListener('change', (e) => {
                this.filters.tags = e.target.value;
                this.loadProblems();
            });
        }
    }

    debounce(func, wait) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(func, wait);
    }

    async loadProblems() {
        try {
            // Build query parameters
            const params = new URLSearchParams();
            
            if (this.filters.search) {
                params.append('search', this.filters.search);
            }
            if (this.filters.minRating) {
                params.append('minRating', this.filters.minRating);
            }
            if (this.filters.maxRating) {
                params.append('maxRating', this.filters.maxRating);
            }
            if (this.filters.tags) {
                params.append('tags', this.filters.tags);
            }
            params.append('count', this.problemsPerPage);

            const response = await fetch(`/api/problems/by-rating?${params.toString()}`);
            this.problems = await response.json();
            this.renderProblems();
        } catch (error) {
            console.error('Error loading problems:', error);
            this.showNotification('Failed to load problems', 'error');
        }
    }

    renderProblems() {
        const container = document.getElementById('problems-grid');
        if (!container) return;

        if (this.problems.length === 0) {
            container.innerHTML = `
                <div class="no-problems">
                    <i class="fas fa-search"></i>
                    <p>No problems found matching your criteria</p>
                    <button class="btn btn-primary" onclick="window.problemsController.clearFilters()">
                        Clear Filters
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.problems.map(problem => `
            <div class="problem-card" onclick="window.problemsController.showProblemDetails('${problem.contestId}', '${problem.index}')">
                <h4>${problem.name}</h4>
                <div class="problem-rating">Rating: ${problem.rating}</div>
                <div class="problem-tags">
                    ${problem.tags?.slice(0, 3).map(tag => 
                        `<span class="problem-tag">${tag}</span>`
                    ).join('') || ''}
                </div>
                <div class="problem-actions">
                    <a href="${problem.url}" target="_blank" class="btn btn-outline btn-sm">
                        <i class="fas fa-external-link-alt"></i>
                        View
                    </a>
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.problemsController.practiceProblem('${problem.contestId}', '${problem.index}')">
                        <i class="fas fa-play"></i>
                        Practice
                    </button>
                </div>
            </div>
        `).join('');
    }

    async showProblemDetails(contestId, index) {
        try {
            const response = await fetch(`/api/problems/${contestId}/${index}`);
            const problem = await response.json();
            
            this.showProblemModal(problem);
        } catch (error) {
            console.error('Error loading problem details:', error);
            this.showNotification('Failed to load problem details', 'error');
        }
    }

    showProblemModal(problem) {
        const modalContent = `
            <div class="problem-details-modal">
                <div class="problem-details-header">
                    <h3>${problem.name}</h3>
                    <div class="problem-details-meta">
                        <span class="problem-rating-badge">Rating: ${problem.rating}</span>
                        <span class="problem-contest-badge">Contest: ${problem.contestId}</span>
                    </div>
                </div>
                <div class="problem-details-info">
                    <div class="info-item">
                        <i class="fas fa-tag"></i>
                        <span>Index: ${problem.index}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-external-link-alt"></i>
                        <a href="${problem.url}" target="_blank">View on Codeforces</a>
                    </div>
                </div>
                ${problem.tags && problem.tags.length > 0 ? `
                    <div class="problem-tags-section">
                        <h4>Tags</h4>
                        <div class="tags-list">
                            ${problem.tags.map(tag => `
                                <span class="problem-tag">${tag}</span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                <div class="problem-actions">
                    <a href="${problem.url}" target="_blank" class="btn btn-primary">
                        <i class="fas fa-external-link-alt"></i>
                        Solve on Codeforces
                    </a>
                    <button class="btn btn-secondary" onclick="window.problemsController.practiceProblem('${problem.contestId}', '${problem.index}')">
                        <i class="fas fa-play"></i>
                        Practice Here
                    </button>
                </div>
            </div>
        `;

        this.showModal('Problem Details', modalContent);
    }

    practiceProblem(contestId, index) {
        // Check if user is authenticated and verified
        if (!window.authController.isAuthenticated()) {
            window.authController.requireAuth(() => {
                this.practiceProblem(contestId, index);
            });
            return;
        }

        if (!window.authController.isVerified()) {
            window.authController.requireVerification(() => {
                this.practiceProblem(contestId, index);
            });
            return;
        }

        // Navigate to practice mode or create a practice game
        this.showNotification('Practice mode coming soon!', 'info');
    }

    clearFilters() {
        // Reset filters
        this.filters = {
            search: '',
            minRating: '',
            maxRating: '',
            tags: ''
        };

        // Reset UI
        const searchInput = document.getElementById('problem-search');
        const ratingFilter = document.getElementById('rating-filter');
        const tagFilter = document.getElementById('tag-filter');

        if (searchInput) searchInput.value = '';
        if (ratingFilter) ratingFilter.value = '';
        if (tagFilter) tagFilter.value = '';

        // Reload problems
        this.loadProblems();
    }

    async loadSuggestedProblems() {
        try {
            const user = window.authController.getCurrentUser();
            const rating = user?.rating || 1200;
            
            const response = await fetch(`/api/problems/suggested?rating=${rating}`);
            const problems = await response.json();
            
            return problems;
        } catch (error) {
            console.error('Error loading suggested problems:', error);
            return [];
        }
    }

    async loadProblemsByTags(tags) {
        try {
            const response = await fetch(`/api/problems/by-tags?tags=${tags.join(',')}&count=20`);
            return await response.json();
        } catch (error) {
            console.error('Error loading problems by tags:', error);
            return [];
        }
    }

    async loadProblemsByRating(minRating, maxRating) {
        try {
            const params = new URLSearchParams();
            if (minRating) params.append('minRating', minRating);
            if (maxRating) params.append('maxRating', maxRating);
            params.append('count', '20');

            const response = await fetch(`/api/problems/by-rating?${params.toString()}`);
            return await response.json();
        } catch (error) {
            console.error('Error loading problems by rating:', error);
            return [];
        }
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

// Initialize problems controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.problemsController = new ProblemsController();
}); 