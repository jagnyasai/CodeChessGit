// Authentication Controller
class AuthController {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.checkAuthStatus();
        this.initEventListeners();
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/auth/status');
            const data = await response.json();
            
            if (data.authenticated) {
                this.currentUser = data.user;
                this.onUserAuthenticated(data.user);
            } else {
                this.onUserUnauthenticated();
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            this.onUserUnauthenticated();
        }
    }

    initEventListeners() {
        // Login button
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                this.login();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Handle verification modal
        this.initHandleVerification();
    }

    login() {
        window.location.href = '/auth/google';
    }

    async logout() {
        try {
            const response = await fetch('/auth/logout');
            if (response.ok) {
                this.onUserUnauthenticated();
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Error logging out:', error);
        }
    }

    onUserAuthenticated(user) {
        this.currentUser = user;
        
        // Update UI
        this.updateAuthUI(user);
        
        // Check if user needs handle verification
        if (!user.isVerified) {
            this.showHandleVerificationModal();
        }
        
        // Emit event for other controllers
        window.dispatchEvent(new CustomEvent('userAuthenticated', { detail: user }));
    }

    onUserUnauthenticated() {
        this.currentUser = null;
        this.updateAuthUI(null);
        
        // Emit event for other controllers
        window.dispatchEvent(new CustomEvent('userUnauthenticated'));
    }

    updateAuthUI(user) {
        const loginBtn = document.getElementById('login-btn');
        const userMenu = document.getElementById('user-menu');
        
        if (user) {
            // User is authenticated
            if (loginBtn) loginBtn.style.display = 'none';
            if (userMenu) {
                userMenu.style.display = 'flex';
                
                // Update user info
                const userName = document.getElementById('user-name');
                const userRating = document.getElementById('user-rating');
                const userAvatar = document.getElementById('user-avatar');
                
                if (userName) userName.textContent = user.name;
                if (userRating) userRating.textContent = `Rating: ${user.rating}`;
                if (userAvatar) userAvatar.src = user.avatar;
            }
        } else {
            // User is not authenticated
            if (loginBtn) loginBtn.style.display = 'block';
            if (userMenu) userMenu.style.display = 'none';
        }
    }

    initHandleVerification() {
        const verifyBtn = document.getElementById('verify-handle-btn');
        const closeBtn = document.getElementById('handle-modal-close');
        const handleInput = document.getElementById('handle-input');
        
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => {
                this.verifyHandle();
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideHandleVerificationModal();
            });
        }
        
        if (handleInput) {
            handleInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.verifyHandle();
                }
            });
        }
    }

    showHandleVerificationModal() {
        const modal = document.getElementById('handle-modal');
        const overlay = document.getElementById('modal-overlay');
        
        if (modal && overlay) {
            overlay.classList.add('active');
            modal.style.display = 'block';
            
            // Focus on input
            const handleInput = document.getElementById('handle-input');
            if (handleInput) {
                handleInput.focus();
            }
        }
    }

    hideHandleVerificationModal() {
        const modal = document.getElementById('handle-modal');
        const overlay = document.getElementById('modal-overlay');
        
        if (modal && overlay) {
            overlay.classList.remove('active');
            modal.style.display = 'none';
        }
    }

    async verifyHandle() {
        const handleInput = document.getElementById('handle-input');
        const handle = handleInput.value.trim();
        
        if (!handle) {
            this.showNotification('Please enter a Codeforces handle', 'error');
            return;
        }
        
        try {
            // Show loading state
            const verifyBtn = document.getElementById('verify-handle-btn');
            const originalText = verifyBtn.textContent;
            verifyBtn.textContent = 'Verifying...';
            verifyBtn.disabled = true;
            
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
                this.hideHandleVerificationModal();
                
                // Update user data
                if (this.currentUser) {
                    this.currentUser.isVerified = true;
                    this.currentUser.codeforcesHandle = handle;
                    this.currentUser.rating = data.rating;
                    
                    // Update UI
                    this.updateAuthUI(this.currentUser);
                }
                
                // Emit event for other controllers
                window.dispatchEvent(new CustomEvent('handleVerified', { 
                    detail: { handle, rating: data.rating } 
                }));
            } else {
                this.showNotification(data.error || 'Failed to verify handle', 'error');
            }
        } catch (error) {
            console.error('Error verifying handle:', error);
            this.showNotification('Failed to verify handle. Please try again.', 'error');
        } finally {
            // Reset button state
            const verifyBtn = document.getElementById('verify-handle-btn');
            if (verifyBtn) {
                verifyBtn.textContent = 'Verify Handle';
                verifyBtn.disabled = false;
            }
        }
    }

    async checkHandleExists(handle) {
        try {
            const response = await fetch(`/api/codeforces/verify/${handle}`);
            const data = await response.json();
            return data.exists;
        } catch (error) {
            console.error('Error checking handle:', error);
            return false;
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

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Check if user is verified
    isVerified() {
        return this.currentUser && this.currentUser.isVerified;
    }

    // Require authentication
    requireAuth(callback) {
        if (this.isAuthenticated()) {
            callback(this.currentUser);
        } else {
            this.showNotification('Please log in to continue', 'warning');
            this.login();
        }
    }

    // Require verification
    requireVerification(callback) {
        if (this.isVerified()) {
            callback(this.currentUser);
        } else {
            this.showNotification('Please verify your Codeforces handle first', 'warning');
            this.showHandleVerificationModal();
        }
    }
}

// Initialize auth controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authController = new AuthController();
}); 