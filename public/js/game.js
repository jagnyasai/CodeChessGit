// Game Controller
class GameController {
    constructor() {
        this.currentGame = null;
        this.currentProblemIndex = 0;
        this.editor = null;
        this.timer = null;
        this.gameStartTime = null;
        this.waitingPollInterval = null;
        this.gameEnded = false;
        this.init();
    }

    init() {
        this.initCodeEditor();
        this.initEventListeners();
        this.checkCurrentGame();
    }

    initCodeEditor() {
        const editorElement = document.getElementById('code-editor');
        if (!editorElement) return;

        this.editor = CodeMirror(editorElement, {
            value: this.getDefaultCode('cpp'),
            mode: 'text/x-c++src',
            theme: 'monokai',
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 4,
            tabSize: 4,
            lineWrapping: true,
            extraKeys: {
                'Ctrl-Space': 'autocomplete'
            }
        });

        // Set editor size
        this.editor.setSize('100%', '400px');
    }

    getDefaultCode(language) {
        const templates = {
            cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Your code here
    
    return 0;
}`,
            java: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
        // Your code here
        
        sc.close();
    }
}`,
            python: `# Your code here
import sys

def solve():
    # Your solution here
    pass

if __name__ == "__main__":
    solve()`,
            javascript: `// Your code here
process.stdin.resume();
process.stdin.setEncoding('utf-8');

let inputString = '';
let currentLine = 0;

process.stdin.on('data', inputStdin => {
    inputString += inputStdin;
});

process.stdin.on('end', _ => {
    inputString = inputString.trim().split('\\n');
    main();
});

function readLine() {
    return inputString[currentLine++];
}

function main() {
    // Your code here
}`
        };

        return templates[language] || templates.cpp;
    }

    initEventListeners() {
        // Language selector
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.changeLanguage(e.target.value);
            });
        }

        // Submit button
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.submitSolution();
            });
        }

        // Leave game button
        const leaveBtn = document.getElementById('leave-game-btn');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', () => {
                this.leaveGame();
            });
        }

        // Chat input
        const chatInput = document.getElementById('chat-input');
        const sendChatBtn = document.getElementById('send-chat-btn');
        
        if (chatInput && sendChatBtn) {
            sendChatBtn.addEventListener('click', () => {
                this.sendChatMessage();
            });
            
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendChatMessage();
                }
            });
        }
    }

    async checkCurrentGame() {
        try {
            const response = await fetch('/api/games/current');
            const data = await response.json();
            
            if (data.game) {
                this.initGame(data.game);
            }
        } catch (error) {
            console.error('Error checking current game:', error);
        }
    }

    initGame(game) {
        this.currentGame = game;
        this.gameStartTime = new Date();
        // Load points from localStorage if available
        this.loadPointsFromStorage();
        // Update game UI
        this.updateGameUI();
        // Join socket room
        if (window.app.socket) {
            window.app.socket.emit('join-game', {
                gameId: game._id,
                userId: window.authController.getCurrentUser()?.id
            });
        }
        // Start timer (for elapsed time display only)
        this.startTimer();
        // Load first problem
        if (game.problems && game.problems.length > 0) {
            this.loadProblem(0);
        }
        // --- Add polling if game is waiting ---
        if (game.status === 'waiting' || !game.problems || game.problems.length === 0) {
            if (this.waitingPollInterval) clearInterval(this.waitingPollInterval);
            this.waitingPollInterval = setInterval(async () => {
                try {
                    const response = await fetch('/api/games/current');
                    const data = await response.json();
                    if (data.game && data.game.status === 'active' && data.game.problems && data.game.problems.length > 0) {
                        clearInterval(this.waitingPollInterval);
                        this.initGame(data.game);
                    }
                } catch (err) {
                    // Optionally handle error
                }
            }, 3000);
        } else {
            if (this.waitingPollInterval) clearInterval(this.waitingPollInterval);
        }
    }

    updateGameUI() {
        if (!this.currentGame) return;

        // Update game title
        const gameTitle = document.getElementById('game-title');
        if (gameTitle) {
            gameTitle.textContent = `Game vs ${this.getOpponentName()}`;
        }

        // Update game status
        const gameStatus = document.getElementById('game-status');
        if (gameStatus) {
            gameStatus.textContent = this.currentGame.status === 'active' ? 'Game in progress' : 'Waiting...';
        }

        // Update players info
        this.updatePlayersInfo();

        // Update problems list
        this.updateProblemsList();
    }

    getOpponentName() {
        if (!this.currentGame) return 'Unknown';
        
        const currentUserId = window.authController.getCurrentUser()?.id;
        const opponent = this.currentGame.player1._id === currentUserId ? 
            this.currentGame.player2 : this.currentGame.player1;
        
        return opponent.name || 'Unknown';
    }

    updatePlayersInfo() {
        if (!this.currentGame) return;

        const currentUserId = window.authController.getCurrentUser()?.id;
        const player1 = this.currentGame.player1;
        const player2 = this.currentGame.player2;

        // Update player 1 card
        const player1Card = document.getElementById('player1-card');
        if (player1Card) {
            const avatar = player1Card.querySelector('.player-avatar');
            const name = player1Card.querySelector('.player-name');
            const rating = player1Card.querySelector('.player-rating');
            const score = player1Card.querySelector('.player-score');

            // Avatar fallback logic
            if (avatar) {
                if (player1.avatar) {
                    avatar.src = player1.avatar;
                    avatar.style.display = 'block';
                    if (avatar.nextElementSibling && avatar.nextElementSibling.classList.contains('avatar-fallback')) {
                        avatar.nextElementSibling.remove();
                    }
                } else {
                    avatar.style.display = 'none';
                    if (!avatar.nextElementSibling || !avatar.nextElementSibling.classList.contains('avatar-fallback')) {
                        const fallback = document.createElement('div');
                        fallback.className = 'avatar-fallback';
                        fallback.textContent = player1.name ? player1.name[0].toUpperCase() : 'P';
                        avatar.parentNode.insertBefore(fallback, avatar.nextSibling);
                    }
                }
            }
            if (name) name.textContent = player1.name;
            if (rating) rating.textContent = `Rating: ${player1.rating}`;
            if (score) {
                const solvedCount = this.currentGame.problems.filter(p => 
                    p.solvedBy === player1._id
                ).length;
                score.textContent = solvedCount;
            }
        }

        // Update player 2 card
        const player2Card = document.getElementById('player2-card');
        if (player2Card) {
            const avatar = player2Card.querySelector('.player-avatar');
            const name = player2Card.querySelector('.player-name');
            const rating = player2Card.querySelector('.player-rating');
            const score = player2Card.querySelector('.player-score');

            // Avatar fallback logic
            if (avatar) {
                if (player2.avatar) {
                    avatar.src = player2.avatar;
                    avatar.style.display = 'block';
                    if (avatar.nextElementSibling && avatar.nextElementSibling.classList.contains('avatar-fallback')) {
                        avatar.nextElementSibling.remove();
                    }
                } else {
                    avatar.style.display = 'none';
                    if (!avatar.nextElementSibling || !avatar.nextElementSibling.classList.contains('avatar-fallback')) {
                        const fallback = document.createElement('div');
                        fallback.className = 'avatar-fallback';
                        fallback.textContent = player2.name ? player2.name[0].toUpperCase() : 'P';
                        avatar.parentNode.insertBefore(fallback, avatar.nextSibling);
                    }
                }
            }
            if (name) name.textContent = player2.name;
            if (rating) rating.textContent = `Rating: ${player2.rating}`;
            if (score) {
                const solvedCount = this.currentGame.problems.filter(p => 
                    p.solvedBy === player2._id
                ).length;
                score.textContent = solvedCount;
            }
        }
    }

    updateProblemsList() {
        if (!this.currentGame) return;

        const container = document.getElementById('problems-list');
        if (!container) return;

        // Show waiting message if game is waiting or no problems
        if (this.currentGame.status === 'waiting' || !this.currentGame.problems || this.currentGame.problems.length === 0) {
            container.innerHTML = `<div class="waiting-message">Waiting for opponent to join...<br>Problems will appear when the game starts.</div>`;
            return;
        }

        container.innerHTML = this.currentGame.problems.map((problem, index) => {
            const isSolved = problem.solvedBy !== null;
            const solvedByMe = problem.solvedBy === window.authController.getCurrentUser()?.id;
            const isActive = index === this.currentProblemIndex;

            return `
                <div class="problem-item ${isActive ? 'active' : ''} ${isSolved ? 'solved' : ''}" 
                     onclick="window.gameController.loadProblem(${index})">
                    <div class="problem-title">${problem.name}</div>
                    <div class="problem-rating">Rating: ${problem.rating}</div>
                    ${isSolved ? `<div class="problem-solved-by">${solvedByMe ? 'You' : 'Opponent'} solved</div>` : ''}
                </div>
            `;
        }).join('');
    }

    loadProblem(index) {
        if (!this.currentGame || !this.currentGame.problems[index]) return;

        this.currentProblemIndex = index;
        const problem = this.currentGame.problems[index];

        // Update problem view
        const title = document.getElementById('problem-title');
        const rating = document.getElementById('problem-rating');
        const description = document.getElementById('problem-description');

        if (title) title.textContent = problem.name;
        if (rating) rating.textContent = `Rating: ${problem.rating}`;
        if (description) {
            description.innerHTML = `
                <button id="view-on-cf-btn" class="btn btn-outline" style="margin-bottom:1rem;">View on Codeforces</button>
                <button id="solved-on-cf-btn" class="btn btn-primary" style="margin-bottom:1rem; margin-left:1rem;">Solved on CF</button>
            `;
        }

        // Add event listeners for the buttons
        setTimeout(() => {
            const viewBtn = document.getElementById('view-on-cf-btn');
            if (viewBtn) {
                viewBtn.onclick = () => {
                    window.open(`https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`, '_blank');
                };
            }
            const solvedBtn = document.getElementById('solved-on-cf-btn');
            if (solvedBtn) {
                solvedBtn.onclick = async () => {
                    const user = window.authController.getCurrentUser();
                    const myId = (user && (user._id || user.id)) || '';
                    if (!user || !user.codeforcesHandle) {
                        this.showNotification('You must verify your Codeforces handle first.', 'error');
                        return;
                    }
                    solvedBtn.disabled = true;
                    solvedBtn.textContent = 'Checking...';
                    try {
                        const res = await fetch(`/api/codeforces/submissions/${user.codeforcesHandle}?count=1000`);
                        const submissions = await res.json();
                        const found = submissions.some(sub =>
                            sub.verdict === 'OK' &&
                            sub.problem &&
                            sub.problem.contestId == problem.contestId &&
                            sub.problem.index == problem.index
                        );
                        if (found) {
                            this.awardPointToUser(myId);
                            this.showNotification('Verified! You solved this problem on Codeforces.', 'success');
                        } else {
                            this.showNotification('No accepted submission found for this problem on your Codeforces account.', 'error');
                        }
                    } catch (err) {
                        this.showNotification('Failed to verify submission.', 'error');
                    } finally {
                        solvedBtn.disabled = false;
                        solvedBtn.textContent = 'Solved on CF';
                    }
                };
            }
        }, 0);

        // Update problems list
        this.updateProblemsList();

        // Check if problem is already solved
        if (problem.solvedBy) {
            this.showNotification('This problem has already been solved!', 'warning');
        }

        // Update points display
        this.updatePointsDisplay();
    }

    getPointsStorageKey() {
        return `game-points-${this.currentGame?._id}`;
    }

    loadPointsFromStorage() {
        if (!this.currentGame) return;
        const key = this.getPointsStorageKey();
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                this.currentGame.points = JSON.parse(stored);
            } catch {}
        }
    }

    awardPointToUser(userId) {
        // Award a point to the user in the current game (local only for now)
        if (!this.currentGame) return;
        if (!this.currentGame.points) this.currentGame.points = {};
        if (!this.currentGame.points[userId]) this.currentGame.points[userId] = 0;
        this.currentGame.points[userId]++;
        // Save to localStorage
        const key = this.getPointsStorageKey();
        localStorage.setItem(key, JSON.stringify(this.currentGame.points));
        this.updatePointsDisplay();
    }

    updatePointsDisplay() {
        // Show both players' points in the game room
        const pointsDiv = document.getElementById('game-points');
        if (!pointsDiv) return;
        const player1 = this.currentGame.player1;
        const player2 = this.currentGame.player2;
        const points = this.currentGame.points || {};
        pointsDiv.innerHTML = `
            <div><strong>${player1.name || player1.codeforcesHandle || 'Player 1'}:</strong> ${points[player1._id] || 0} points</div>
            <div><strong>${player2.name || player2.codeforcesHandle || 'Player 2'}:</strong> ${points[player2._id] || 0} points</div>
        `;
    }

    changeLanguage(language) {
        if (!this.editor) return;

        const modeMap = {
            'cpp': 'text/x-c++src',
            'java': 'text/x-java',
            'python': 'text/x-python',
            'javascript': 'text/javascript'
        };

        this.editor.setOption('mode', modeMap[language] || 'text/x-c++src');
        this.editor.setValue(this.getDefaultCode(language));
    }

    async submitSolution() {
        if (!this.currentGame || !this.editor) return;

        const problem = this.currentGame.problems[this.currentProblemIndex];
        if (problem.solvedBy) {
            this.showNotification('This problem has already been solved!', 'warning');
            return;
        }

        const code = this.editor.getValue();
        const language = document.getElementById('language-select').value;

        if (!code.trim()) {
            this.showNotification('Please write some code before submitting', 'error');
            return;
        }

        try {
            // Show loading state
            const submitBtn = document.getElementById('submit-btn');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;

            // Notify opponent via socket
            if (window.app.socket) {
                window.app.socket.emit('submit-code', {
                    gameId: this.currentGame._id,
                    code: code,
                    language: language,
                    problemIndex: this.currentProblemIndex,
                    userId: window.authController.getCurrentUser()?.id
                });
            }

            const response = await fetch('/api/games/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: code,
                    language: language,
                    problemIndex: this.currentProblemIndex
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showSubmissionResult(data.result);
                
                if (data.result.verdict === 'Accepted') {
                    this.showNotification('Problem solved!', 'success');
                    
                    // Notify via socket
                    if (window.app.socket) {
                        window.app.socket.emit('problem-solved', {
                            gameId: this.currentGame._id,
                            problemIndex: this.currentProblemIndex,
                            userId: window.authController.getCurrentUser()?.id,
                            problemName: problem.name
                        });
                    }
                    
                    // Update game state
                    this.currentGame = data.game;
                    this.updateGameUI();
                    
                    // Check if game is won
                    if (data.game.status === 'completed') {
                        this.handleGameEnd(data.game);
                    }
                } else {
                    this.showNotification(`Wrong Answer: ${data.result.verdict}`, 'error');
                }
            } else {
                this.showNotification(data.error || 'Submission failed', 'error');
            }
        } catch (error) {
            console.error('Error submitting solution:', error);
            this.showNotification('Failed to submit solution', 'error');
        } finally {
            // Reset button state
            const submitBtn = document.getElementById('submit-btn');
            if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    showSubmissionResult(result) {
        const container = document.getElementById('submission-result');
        if (!container) return;

        const verdictClass = result.verdict === 'Accepted' ? 'success' : 'error';
        
        container.innerHTML = `
            <div class="submission-result-${verdictClass}">
                <h4>${result.verdict}</h4>
                <p>Execution Time: ${result.executionTime}ms</p>
                <p>Memory Used: ${result.memoryUsed}KB</p>
            </div>
        `;

        // Clear result after 5 seconds
        setTimeout(() => {
            container.innerHTML = '';
        }, 5000);
    }

    async leaveGame() {
        if (!this.currentGame) return;

        if (confirm('Are you sure you want to leave the game? This will result in a loss.')) {
            try {
                const response = await fetch('/api/games/leave', {
                    method: 'POST'
                });

                if (response.ok) {
                    this.showNotification('Game left successfully', 'info');
                    window.app.navigateToPage('dashboard');
                } else {
                    this.showNotification('Failed to leave game', 'error');
                }
            } catch (error) {
                console.error('Error leaving game:', error);
                this.showNotification('Failed to leave game', 'error');
            }
        }
    }

    startTimer() {
        this.timer = setInterval(() => {
            if (this.gameStartTime) {
                const elapsed = Math.floor((new Date() - this.gameStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                
                const timerElement = document.getElementById('game-timer');
                if (timerElement) {
                    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    handleGameEnd(game) {
        if (this.gameEnded) return;
        this.gameEnded = true;
        this.stopTimer();
        // Determine winner
        const player1Solved = game.problems.filter(p => p.solvedBy === game.player1._id).length;
        const player2Solved = game.problems.filter(p => p.solvedBy === game.player2._id).length;
        let winnerMsg = '';
        if (player1Solved > player2Solved) {
            winnerMsg = `${game.player1.name || 'Player 1'} wins!`;
        } else if (player2Solved > player1Solved) {
            winnerMsg = `${game.player2.name || 'Player 2'} wins!`;
        } else {
            winnerMsg = 'It\'s a tie!';
        }
        this.showNotification(`Game over! ${winnerMsg}`, 'info');
    }

    sendChatMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();
        
        if (!message || !this.currentGame) return;
        
        const user = window.authController.getCurrentUser();
        const myId = (user && (user._id || user.id)) || '';
        
        // Send via socket
        if (window.app.socket) {
            window.app.socket.emit('chat-message', {
                gameId: this.currentGame._id,
                userId: myId,
                message: message,
                userName: user.name
            });
        }
        
        chatInput.value = '';
    }

    addChatMessage(messageData) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        const user = window.authController.getCurrentUser();
        const myId = (user && (user._id || user.id)) || '';
        const isOwnMessage = messageData.userId === myId;
        
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${isOwnMessage ? 'own' : ''}`;
        messageElement.innerHTML = `
            <div class="chat-message-header">
                <span class="chat-message-user">${messageData.userName}</span>
                <span class="chat-message-time">${this.formatTime(messageData.timestamp)}</span>
            </div>
            <div class="chat-message-content">${messageData.message}</div>
        `;
        
        container.appendChild(messageElement);
        container.scrollTop = container.scrollHeight;
    }

    formatTime(date) {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    showTypingIndicator(isTyping) {
        // Implementation for typing indicator
        console.log('Opponent typing:', isTyping);
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

// Initialize game controller only if on the game page

document.addEventListener('DOMContentLoaded', () => {
    const gamePage = document.getElementById('game-page');
    if (gamePage && gamePage.classList.contains('active')) {
        window.gameController = new GameController();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
    if (backToDashboardBtn) {
        backToDashboardBtn.onclick = function() {
            // Hide the result modal
            const resultModal = document.getElementById('result-modal');
            if (resultModal) resultModal.style.display = 'none';
            // Redirect to dashboard
            window.location.href = '/dashboard';
        };
    }
}); 