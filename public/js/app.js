document.addEventListener('DOMContentLoaded', function() {
    const loading = document.getElementById('loading-screen');
    if (loading) {
        loading.style.opacity = '0';
        loading.style.display = 'none';
    }
    // Hide login button if already authenticated
    fetch('/auth/status').then(res => res.json()).then(data => {
        if (data.authenticated) {
            const loginBtn = document.getElementById('login-btn');
            const userMenu = document.getElementById('user-menu');
            if (loginBtn) loginBtn.style.display = 'none';
            if (userMenu) userMenu.style.display = 'flex';
        }
    });
});

// Main Application Controller
class App {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'home';
        this.init();
    }

    async init() {
        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading-screen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
            }, 500);
        }, 2000);

        // Initialize components
        this.initNavigation();
        this.initEventListeners();
        
        // Check authentication status
        await this.checkAuthStatus();
    }

    initNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');

        // Debug: log when window width becomes less than 1024
        window.addEventListener('resize', () => {
            if (window.innerWidth < 1024) {
                console.log('Window width is less than 1024px');
                if (navToggle) {
                    console.log('Hamburger icon is now visible');
                }
            }
        });
        // Initial check
        if (window.innerWidth < 1024 && navToggle) {
            console.log('Window width is less than 1024px (on load)');
            console.log('Hamburger icon is now visible');
        }

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateToPage(page);
                // Close menu on mobile after click
                if (window.innerWidth < 1024) {
                    navMenu.classList.remove('active');
                    navToggle.classList.remove('active');
                    console.log('Menu closed (nav link click)');
                }
            });
        });

        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
            console.log('Hamburger icon clicked');
            if (navMenu.classList.contains('active')) {
                console.log('Menu opened');
            } else {
                console.log('Menu closed');
            }
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.navbar')) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
                if (window.innerWidth < 1024) {
                    console.log('Menu closed (outside click)');
                }
            }
        });

        // Robust: Close menu on mobile after any nav-link click (event delegation)
        document.getElementById('nav-menu').addEventListener('click', function(e) {
            if (e.target.classList.contains('nav-link')) {
                if (window.innerWidth < 1024) {
                    document.getElementById('nav-menu').classList.remove('active');
                    document.getElementById('nav-toggle').classList.remove('active');
                    console.log('Menu closed (nav link click - delegated)');
                }
            }
        });
    }

    initEventListeners() {
        // Login button
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                window.location.href = '/auth/google';
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                window.location.href = '/auth/logout';
            });
        }

        // Get started button
        const getStartedBtn = document.getElementById('get-started-btn');
        if (getStartedBtn) {
            getStartedBtn.addEventListener('click', () => {
                if (this.currentUser) {
                    if (!this.currentUser.isVerified) {
                        this.showHandleModal();
                    } else {
                        this.navigateToPage('dashboard');
                    }
                } else {
                    window.location.href = '/auth/google';
                }
            });
        }

        // Current game link
        const currentGameLink = document.getElementById('current-game-link');
        if (currentGameLink) {
            currentGameLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToPage('game');
            });
        }

        // Past games link
        const pastGamesLink = document.getElementById('past-games-link');
        if (pastGamesLink) {
            pastGamesLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToPage('past-games');
            });
        }

        // Cancel game button
        const cancelGameBtn = document.getElementById('cancel-game-btn');
        if (cancelGameBtn) {
            cancelGameBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to cancel the current game?')) {
                    try {
                        const response = await fetch('/api/games/cancel', { method: 'POST' });
                        const data = await response.json();
                        if (data.success) {
                            this.showNotification('Game cancelled.', 'success');
                            this.currentUser.currentGame = null;
                            document.getElementById('current-game-link').style.display = 'none';
                            document.getElementById('cancel-game-btn').style.display = 'none';
                            this.navigateToPage('dashboard');
                        } else {
                            this.showNotification(data.error || 'Failed to cancel game', 'error');
                        }
                    } catch (error) {
                        this.showNotification('Failed to cancel game', 'error');
                    }
                }
            });
        }

        // User stats click to profile
        const userStats = document.getElementById('user-stats');
        if (userStats) {
            userStats.addEventListener('click', () => {
                this.navigateToPage('profile');
                this.loadProfilePage();
            });
        }
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/auth/status');
            const data = await response.json();
            
            if (data.authenticated) {
                this.currentUser = data.user;
                this.updateUIForAuthenticatedUser();
                
                // If user is not verified, show handle verification modal
                if (!this.currentUser.isVerified) {
                    this.showHandleModal();
                }
            } else {
                this.updateUIForUnauthenticatedUser();
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            this.updateUIForUnauthenticatedUser();
        }
    }

    updateUIForAuthenticatedUser() {
        console.log('updateUIForAuthenticatedUser called');
        document.body.classList.remove('not-authenticated');
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) loginBtn.style.display = '';
        document.getElementById('user-menu').style.display = 'flex';
        // Show dashboard content
        const dashboardContent = document.querySelector('.dashboard-content');
        if (dashboardContent) {
            dashboardContent.style.display = '';
        }
        // Only show avatar in navbar
        const firstName = this.currentUser.name.split(' ')[0];
        const userNameElem = document.getElementById('user-name');
        if (userNameElem) userNameElem.style.display = 'none';
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.style.display = 'none';
        // Avatar logic
        const avatarImg = document.getElementById('user-avatar');
        if (avatarImg) {
            if (this.currentUser.avatar && this.currentUser.avatar.trim() !== '' && this.currentUser.avatar !== 'null') {
                avatarImg.src = this.currentUser.avatar;
                avatarImg.alt = firstName + ' avatar';
            } else {
                // Create SVG with first letter, use encodeURIComponent for reliability
                const letter = firstName.charAt(0).toUpperCase();
                const svg = `<svg width='24' height='24' xmlns='http://www.w3.org/2000/svg'><circle cx='12' cy='12' r='12' fill='%232563eb'/><text x='50%' y='58%' text-anchor='middle' dominant-baseline='middle' font-size='13' fill='%23fff' font-family='Inter,Arial,sans-serif'>${letter}</text></svg>`;
                avatarImg.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
                avatarImg.alt = letter + ' avatar';
            }
            // Attach dropdown handler only once
            if (!avatarImg.dataset.dropdownHandler) {
                let dropdownOpen = false;
                const dropdown = document.getElementById('profile-dropdown');
                const dropdownUserName = document.getElementById('dropdown-user-name');
                const dropdownUserRating = document.getElementById('dropdown-user-rating');
                const dropdownUserWon = document.getElementById('dropdown-user-won');
                const dropdownLogoutBtn = document.getElementById('dropdown-logout-btn');
                avatarImg.addEventListener('click', async (e) => {
                    console.log('Avatar clicked');
                    e.stopPropagation();
                    if (!dropdownOpen) {
                        // Show loading state
                        if (dropdownUserName) dropdownUserName.textContent = 'Loading...';
                        if (dropdownUserRating) dropdownUserRating.textContent = '';
                        if (dropdownUserWon) dropdownUserWon.textContent = '';
                        dropdown.style.display = 'flex';
                        dropdownOpen = true;
                        try {
                            const resp = await fetch('/api/users/profile');
                            const userData = await resp.json();
                            if (dropdownUserName) dropdownUserName.textContent = userData.name.split(' ')[0];
                            if (dropdownUserRating) dropdownUserRating.textContent = `Rating: ${userData.rating}`;
                            if (dropdownUserWon) dropdownUserWon.textContent = `Won: ${userData.gamesWon || 0}`;
                        } catch (err) {
                            if (dropdownUserName) dropdownUserName.textContent = this.currentUser.name.split(' ')[0];
                            if (dropdownUserRating) dropdownUserRating.textContent = `Rating: ${this.currentUser.rating}`;
                            if (dropdownUserWon) dropdownUserWon.textContent = `Won: ${this.currentUser.gamesWon || 0}`;
                        }
                        // Attach logout event
                        if (dropdownLogoutBtn) {
                            dropdownLogoutBtn.onclick = () => {
                                window.location.href = '/auth/logout';
                            };
                        }
                        // Attach one-time document click to close
                        const closeDropdown = (evt) => {
                            if (!dropdown.contains(evt.target) && evt.target !== avatarImg) {
                                dropdown.style.display = 'none';
                                dropdownOpen = false;
                                document.removeEventListener('click', closeDropdown);
                            }
                        };
                        setTimeout(() => {
                            document.addEventListener('click', closeDropdown);
                        }, 0);
                    } else {
                        dropdown.style.display = 'none';
                        dropdownOpen = false;
                    }
                });
                avatarImg.dataset.dropdownHandler = 'true';
                console.log('Avatar click handler set');
            }
        } else {
            console.warn('user-avatar element not found');
        }
        // Show dashboard link
        const dashboardLink = document.querySelector('[data-page="dashboard"]');
        if (dashboardLink) {
            dashboardLink.style.display = 'block';
        }

        // Show/hide current game and cancel button
        const currentGameLink = document.getElementById('current-game-link');
        const cancelGameBtn = document.getElementById('cancel-game-btn');
        if (this.currentUser.currentGame) {
            currentGameLink.style.display = 'inline-block';
            cancelGameBtn.style.display = 'inline-block';
        } else {
            currentGameLink.style.display = 'none';
            cancelGameBtn.style.display = 'none';
        }

        const userMenu = document.getElementById('user-menu');
        if (firstName.length > 8) {
            // Only show avatar
            if (userNameElem) userNameElem.style.display = 'none';
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (avatarImg) avatarImg.style.display = 'block';
            if (userMenu) userMenu.style.minWidth = '32px';
        } else {
            // Show avatar, name, and logout
            if (userNameElem) userNameElem.style.display = '';
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) logoutBtn.style.display = '';
            if (avatarImg) avatarImg.style.display = 'block';
            if (userMenu) userMenu.style.minWidth = '';
        }
    }

    updateUIForUnauthenticatedUser() {
        document.body.classList.add('not-authenticated');
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) loginBtn.style.display = '';
        document.getElementById('user-menu').style.display = 'none';
        // Hide dashboard content and show login prompt
        const dashboardContent = document.querySelector('.dashboard-content');
        if (dashboardContent) {
            dashboardContent.style.display = 'none';
            let loginPrompt = document.getElementById('dashboard-login-prompt');
            if (!loginPrompt) {
                loginPrompt = document.createElement('div');
                loginPrompt.id = 'dashboard-login-prompt';
                loginPrompt.style.padding = '2rem 1rem';
                loginPrompt.style.textAlign = 'center';
                loginPrompt.style.fontSize = '1.2rem';
                loginPrompt.style.color = '#64748b';
                loginPrompt.style.background = '#f8fafc';
                loginPrompt.style.borderRadius = '12px';
                loginPrompt.style.margin = '2rem auto';
                loginPrompt.style.maxWidth = '500px';
                loginPrompt.innerHTML = '<b>Please log in to view your dashboard.</b>';
                dashboardContent.parentNode.insertBefore(loginPrompt, dashboardContent);
            } else {
                loginPrompt.style.display = '';
            }
        }
        // Do NOT hide dashboard link, so users can always navigate to dashboard
    }

    navigateToPage(page) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        // Show target page if it exists
        const pageElem = document.getElementById(`${page}-page`);
        if (pageElem) {
            pageElem.classList.add('active');
        } else {
            console.warn(`Page element for '${page}-page' not found.`);
        }
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        const navLink = document.querySelector(`[data-page="${page}"]`);
        if (navLink) navLink.classList.add('active');
        this.currentPage = page;
        // Initialize page-specific functionality
        this.initPageFunctionality(page);
        // Re-initialize GameController if navigating to game page
        if (page === 'game') {
            window.gameController = new GameController();
        }
    }

    initPageFunctionality(page) {
        switch (page) {
            case 'dashboard':
                if (window.dashboardController) {
                    window.dashboardController.init();
                }
                break;
            case 'leaderboard':
                if (window.leaderboardController) {
                    window.leaderboardController.init();
                }
                break;
            case 'contests':
                if (window.contestsController) {
                    window.contestsController.init();
                }
                break;
            case 'problems':
                if (window.problemsController) {
                    window.problemsController.init();
                }
                break;
        }
    }

    // Utility to hide all modals
    hideAllModals() {
        document.querySelectorAll('#modal-overlay .modal').forEach(modal => {
            modal.style.display = 'none';
        });
        document.getElementById('modal-overlay').classList.remove('active');
    }

    showHandleModal() {
        this.hideAllModals();
        const modal = document.getElementById('handle-modal');
        const overlay = document.getElementById('modal-overlay');
        
        // Check if modal is already active
        if (overlay.classList.contains('active')) {
            return;
        }
        
        overlay.classList.add('active');
        modal.style.display = 'block';
        
        // Clear input
        const input = document.getElementById('handle-input');
        if (input) {
            input.value = '';
        }
        
        // Handle modal close
        const closeBtn = document.getElementById('handle-modal-close');
        if (closeBtn) {
            // Remove existing listeners by cloning
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            
            newCloseBtn.addEventListener('click', () => {
                overlay.classList.remove('active');
                modal.style.display = 'none';
            });
        }
        
        // Handle handle verification
        const verifyBtn = document.getElementById('verify-handle-btn');
        if (verifyBtn) {
            // Remove existing listeners by cloning
            const newVerifyBtn = verifyBtn.cloneNode(true);
            verifyBtn.parentNode.replaceChild(newVerifyBtn, verifyBtn);
            
            newVerifyBtn.addEventListener('click', async () => {
                const handle = document.getElementById('handle-input').value.trim();
                
                if (!handle) {
                    this.showNotification('Please enter a Codeforces handle', 'error');
                    return;
                }
                
                newVerifyBtn.disabled = true;
                const originalText = newVerifyBtn.textContent;
                newVerifyBtn.textContent = 'Verifying...';
                
                try {
                    const response = await fetch('/api/users/verify-handle', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ handle })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.showNotification('Handle verified successfully!', 'success');
                        overlay.classList.remove('active');
                        modal.style.display = 'none';
                        
                        // Update user data
                        this.currentUser.isVerified = true;
                        this.currentUser.codeforcesHandle = handle;
                        this.currentUser.rating = data.rating;
                        
                        // Refresh dashboard
                        if (this.currentPage === 'dashboard' && window.dashboardController) {
                            window.dashboardController.init();
                        }
                    } else {
                        this.showNotification(data.error || 'Failed to verify handle', 'error');
                    }
                } catch (error) {
                    console.error('Error verifying handle:', error);
                    this.showNotification('Failed to verify handle', 'error');
                } finally {
                    newVerifyBtn.disabled = false;
                    newVerifyBtn.textContent = originalText;
                }
            });
        }
    }

    showFriendModal() {
        this.showNotification('Play with Friend feature will be added soon!', 'info');
        // Feature coming soon: modal logic is disabled for now
        // If you want to enable the modal, comment out the above line and uncomment the code below.
        // this.hideAllModals();
        // const modal = document.getElementById('friend-modal');
        // const overlay = document.getElementById('modal-overlay');
        // if (overlay.classList.contains('active')) {
        //     return;
        // }
        // overlay.classList.add('active');
        // modal.style.display = 'block';
        // const input = document.getElementById('friend-handle-input');
        // if (input) {
        //     input.value = '';
        // }
        // // ... rest of modal logic ...
    }

    showResultModal(result) {
        this.hideAllModals();
        const modal = document.getElementById('result-modal');
        const overlay = document.getElementById('modal-overlay');
        const title = document.getElementById('result-title');
        const content = document.getElementById('result-content');
        
        title.textContent = result.won ? 'Victory!' : 'Defeat';
        
        content.innerHTML = `
            <div class="result-summary">
                <h4>${result.won ? 'Congratulations! You won!' : 'Better luck next time!'}</h4>
                <p>Game duration: ${result.duration} minutes</p>
                <p>Problems solved: ${result.solvedCount}</p>
            </div>
        `;
        
        overlay.classList.add('active');
        modal.style.display = 'block';
        
        // Handle modal close
        const closeBtn = document.getElementById('result-modal-close');
        if (closeBtn) {
            // Remove existing listeners by cloning
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            
            newCloseBtn.addEventListener('click', () => {
                overlay.classList.remove('active');
                modal.style.display = 'none';
            });
        }
        
        // Handle play again
        const playAgainBtn = document.getElementById('play-again-btn');
        if (playAgainBtn) {
            // Remove existing listeners by cloning
            const newPlayAgainBtn = playAgainBtn.cloneNode(true);
            playAgainBtn.parentNode.replaceChild(newPlayAgainBtn, playAgainBtn);
            
            newPlayAgainBtn.addEventListener('click', () => {
                overlay.classList.remove('active');
                modal.style.display = 'none';
                this.navigateToPage('dashboard');
            });
        }
        
        // Handle back to dashboard
        const backBtn = document.getElementById('back-to-dashboard-btn');
        if (backBtn) {
            // Remove existing listeners by cloning
            const newBackBtn = backBtn.cloneNode(true);
            backBtn.parentNode.replaceChild(newBackBtn, backBtn);
            
            newBackBtn.addEventListener('click', () => {
                overlay.classList.remove('active');
                modal.style.display = 'none';
                this.navigateToPage('dashboard');
            });
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    async loadProfilePage() {
        const infoDiv = document.getElementById('cf-profile-info');
        const graphDiv = document.getElementById('cf-rating-graph');
        const solvedDiv = document.getElementById('cf-solved-summary');
        const ratingWiseDiv = document.getElementById('cf-rating-wise-solved');
        infoDiv.innerHTML = 'Loading...';
        graphDiv.innerHTML = `<div class='cf-graph-wrapper'><canvas id='cf-rating-canvas'></canvas></div>`;
        solvedDiv.innerHTML = '';
        ratingWiseDiv.innerHTML = '';
        if (!this.currentUser.codeforcesHandle) {
            infoDiv.innerHTML = '<span style="color:#dc3545;font-weight:bold;">Please verify your Codeforces handle to view your stats.</span>';
            return;
        }
        try {
            const handle = this.currentUser.codeforcesHandle;
            // Fetch user info
            const infoResp = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
            const infoData = await infoResp.json();
            if (infoData.status === 'OK') {
                const user = infoData.result[0];
                infoDiv.innerHTML = `<b>Handle:</b> ${user.handle} <br><b>Rating:</b> ${user.rating || 'Unrated'} <br><b>Max Rating:</b> ${user.maxRating || 'Unrated'} <br><b>Rank:</b> ${user.rank || '-'} <br><img src='${user.titlePhoto || user.avatar}' alt='avatar' style='width:60px;height:60px;border-radius:50%;margin-top:1rem;'>`;
            } else {
                infoDiv.innerHTML = 'Failed to load profile info.';
                console.error('Codeforces user.info error:', infoData);
            }
            // Fetch rating history
            const ratingResp = await fetch(`https://codeforces.com/api/user.rating?handle=${handle}`);
            const ratingData = await ratingResp.json();
            if (ratingData.status === 'OK' && ratingData.result.length > 0) {
                const points = ratingData.result.map(r => ({ x: new Date(r.ratingUpdateTimeSeconds * 1000), y: r.newRating }));
                graphDiv.innerHTML = `<div class='cf-graph-wrapper'><canvas id='cf-rating-canvas'></canvas></div>`;
                this.renderRatingGraph(points);
                // Responsive: redraw on resize
                if (window._cfGraphResizeHandler) window.removeEventListener('resize', window._cfGraphResizeHandler);
                window._cfGraphResizeHandler = () => {
                    clearTimeout(_cfGraphResizeTimeout);
                    _cfGraphResizeTimeout = setTimeout(() => this.renderRatingGraph(points), 120);
                };
                window.addEventListener('resize', window._cfGraphResizeHandler);
            } else if (ratingData.status === 'OK' && ratingData.result.length === 0) {
                graphDiv.innerHTML = '<span style="color:#dc3545;">No rating history found for this user.</span>';
            } else {
                graphDiv.innerHTML = 'Failed to load rating history.';
                console.error('Codeforces user.rating error:', ratingData);
            }
            // Fetch solved problems
            const statusResp = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`);
            const statusData = await statusResp.json();
            if (statusData.status === 'OK') {
                const solved = statusData.result.filter(sub => sub.verdict === 'OK');
                const unique = {};
                solved.forEach(sub => {
                    const key = `${sub.problem.contestId}${sub.problem.index}`;
                    unique[key] = sub.problem;
                });
                const solvedArr = Object.values(unique);
                if (solvedArr.length === 0) {
                    solvedDiv.innerHTML = '<span style="color:#dc3545;">No solved problems found for this user.</span>';
                } else {
                    solvedDiv.innerHTML = `<b>Total Solved:</b> <span class='cf-solved-badge'>${solvedArr.length}</span><br><div style='max-height:120px;overflow:auto;'>${solvedArr.map(p => `<span style='display:inline-block;margin:2px 6px 2px 0;padding:2px 8px;background:#eee;border-radius:6px;'>${p.name} (${p.contestId}${p.index})</span>`).join('')}</div>`;
                }
                // Rating-wise solved
                const ratingMap = {};
                solvedArr.forEach(p => {
                    if (p.rating) {
                        ratingMap[p.rating] = (ratingMap[p.rating] || 0) + 1;
                    }
                });
                if (Object.keys(ratingMap).length === 0) {
                    ratingWiseDiv.innerHTML = '<span style="color:#dc3545;">No rating-wise solved data found.</span>';
                } else {
                    ratingWiseDiv.innerHTML = `<b>Rating-wise Solved:</b><br>${Object.entries(ratingMap).sort((a,b)=>a[0]-b[0]).map(([r,c]) => `<span style='display:inline-block;margin:2px 8px 2px 0;padding:2px 8px;background:#e0e7ff;border-radius:6px;'>${r}: ${c}</span>`).join('')}`;
                }
            } else {
                solvedDiv.innerHTML = 'Failed to load solved problems.';
                ratingWiseDiv.innerHTML = '';
                console.error('Codeforces user.status error:', statusData);
                if (statusData.comment && statusData.comment.includes('limit exceeded')) {
                    solvedDiv.innerHTML += '<br><span style="color:#dc3545;">Codeforces API rate limit exceeded. Please try again later.</span>';
                }
            }
        } catch (e) {
            infoDiv.innerHTML = 'Error loading profile.';
            graphDiv.innerHTML = '';
            solvedDiv.innerHTML = '';
            ratingWiseDiv.innerHTML = '';
            console.error('Error in loadProfilePage:', e);
        }
    }

    renderRatingGraph(points) {
        const canvas = document.getElementById('cf-rating-canvas');
        if (!canvas || points.length === 0) return;
        const parent = canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        const width = Math.round((parent.offsetWidth || 800) * dpr);
        const height = Math.max(220, Math.round((parent.offsetWidth || 800) * 0.32) * dpr);
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = (width / dpr) + 'px';
        canvas.style.height = (height / dpr) + 'px';
        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Dynamic margins
        const margin = 36;
        // Find min/max rating
        const minY = Math.min(...points.map(p => p.y));
        const maxY = Math.max(...points.map(p => p.y));
        // Draw axes
        ctx.strokeStyle = '#bbb';
        ctx.beginPath();
        ctx.moveTo(40, 10);
        ctx.lineTo(40, 230);
        ctx.lineTo(790, 230);
        ctx.stroke();
        // Draw points and lines
        ctx.strokeStyle = '#667eea';
        ctx.beginPath();
        points.forEach((pt, i) => {
            const x = 40 + (i * (750 / (points.length-1||1)));
            const y = 230 - ((pt.y-minY)/(maxY-minY))*200;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        // Draw dots
        ctx.fillStyle = '#222';
        points.forEach((pt, i) => {
            const x = 40 + (i * (750 / (points.length-1||1)));
            const y = 230 - ((pt.y-minY)/(maxY-minY))*200;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2*Math.PI);
            ctx.fill();
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// Add notification styles
const notificationStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 3000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification-success {
        background: #28a745;
    }
    
    .notification-error {
        background: #dc3545;
    }
    
    .notification-warning {
        background: #ffc107;
        color: #333;
    }
    
    .notification-info {
        background: #17a2b8;
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet); 