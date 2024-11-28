class ChatApp {
    constructor() {
        this.userId = this.generateUserId();
        this.messageContainer = document.getElementById('messages-container');
        this.messageForm = document.getElementById('message-form');
        this.messageInput = document.getElementById('message-input');
        this.usernameModal = document.getElementById('username-modal');
        this.usernameForm = document.getElementById('username-form');
        this.usernameInput = document.getElementById('username-input');
        this.usernameError = document.getElementById('username-error');
        this.appContainer = document.querySelector('.app-container');
        
        this.setupUsernameForm();
    }

    generateUserId() {
        return 'user-' + Math.random().toString(36).substr(2, 9);
    }

    setupUsernameForm() {
        this.usernameForm.onsubmit = (e) => {
            e.preventDefault();
            const username = this.usernameInput.value.trim();
            
            if (username.length >= 2 && username.length <= 20) {
                this.userName = username;
                this.hideUsernameModal();
                this.showChatInterface();
                this.initializeWebSocket();
                this.setupEventListeners();
            } else {
                this.usernameError.classList.add('visible');
            }
        };

        this.usernameInput.oninput = () => {
            this.usernameError.classList.remove('visible');
        };
    }

    hideUsernameModal() {
        this.usernameModal.classList.add('hidden');
    }

    showChatInterface() {
        this.appContainer.style.display = 'flex';
        document.querySelector('.user-profile .username').textContent = this.userName;
    }

    initializeWebSocket() {
        const serverIP = window.location.hostname;
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsURL = `${wsProtocol}//${serverIP}:5000/ws`;
        
        console.log('Connecting to WebSocket:', wsURL);
        
        this.socket = new WebSocket(wsURL);

        this.socket.onopen = () => {
            console.log('WebSocket connected');
            this.socket.send(JSON.stringify({
                userId: this.userId,
                userName: this.userName
            }));
            this.addSystemMessage('Connected to chat');
        };

        this.socket.onmessage = (event) => {
            console.log('Message received:', event.data);
            const data = JSON.parse(event.data);
            if (data.type === 'system') {
                this.addSystemMessage(data.message);
            } else {
                this.addMessage(data);
            }
        };

        this.socket.onclose = () => {
            console.log('WebSocket disconnected');
            this.addSystemMessage('Disconnected from chat. Reconnecting...');
            setTimeout(() => this.initializeWebSocket(), 3000);
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.addSystemMessage('Error connecting to chat');
        };
    }

    setupEventListeners() {
        this.messageForm.onsubmit = (e) => {
            e.preventDefault();
            const message = this.messageInput.value.trim();
            if (message) {
                this.sendMessage(message);
                this.messageInput.value = '';
            }
        };
    }

    sendMessage(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const messageData = {
                message: message,
                timestamp: new Date().toISOString(),
                userId: this.userId,
                userName: this.userName
            };
            this.socket.send(JSON.stringify(messageData));
        } else {
            this.addSystemMessage('Not connected to chat');
        }
    }

    addMessage(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${data.type}`;
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        if (data.type === 'received') {
            const sender = document.createElement('div');
            sender.className = 'message-sender';
            sender.textContent = data.userName;
            content.appendChild(sender);
        }
        
        const messageText = document.createElement('div');
        messageText.textContent = data.message;
        content.appendChild(messageText);
        
        const timestamp = document.createElement('div');
        timestamp.className = 'message-time';
        timestamp.textContent = new Date(data.timestamp).toLocaleTimeString();
        content.appendChild(timestamp);
        
        messageDiv.appendChild(content);
        this.messageContainer.appendChild(messageDiv);
        this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
    }

    addSystemMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.textContent = message;
        this.messageContainer.appendChild(messageDiv);
        this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
