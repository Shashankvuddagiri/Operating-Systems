from flask import Flask, render_template
from flask_sock import Sock
import json
from datetime import datetime
import logging

class ChatServer:
    def __init__(self):
        self.app = Flask(__name__)
        self.sock = Sock(self.app)
        self.clients = {}
        self.setup_routes()
        self.setup_logging()

    def setup_logging(self):
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    def setup_routes(self):
        @self.app.route('/')
        def index():
            return render_template('index.html')

        @self.sock.route('/ws')
        def chat(ws):
            self.handle_websocket(ws)

    def handle_websocket(self, ws):
        user_id = None
        try:
            data = ws.receive()
            user_info = json.loads(data)
            user_id = user_info['userId']
            user_name = user_info['userName']
            
            self.clients[user_id] = {
                'ws': ws,
                'name': user_name
            }
            
            self.broadcast_system_message(f"{user_name} joined the chat")
            self.logger.info(f"User {user_name} ({user_id}) connected. Total clients: {len(self.clients)}")
            
            while True:
                data = ws.receive()
                message = json.loads(data)
                message['userId'] = user_id
                message['userName'] = user_name
                self.broadcast_message(message)
        except Exception as e:
            self.logger.error(f"WebSocket error: {str(e)}")
        finally:
            if user_id and user_id in self.clients:
                user_name = self.clients[user_id]['name']
                del self.clients[user_id]
                self.broadcast_system_message(f"{user_name} left the chat")
            self.logger.info(f"User {user_id} disconnected. Total clients: {len(self.clients)}")

    def broadcast_message(self, message):
        disconnected_users = set()
        
        for user_id, client_info in self.clients.items():
            try:
                client_info['ws'].send(json.dumps({
                    'message': message['message'],
                    'timestamp': message['timestamp'],
                    'userId': message['userId'],
                    'userName': message['userName'],
                    'type': 'received' if user_id != message['userId'] else 'sent'
                }))
            except Exception as e:
                self.logger.error(f"Error broadcasting to user {user_id}: {str(e)}")
                disconnected_users.add(user_id)
        
        for user_id in disconnected_users:
            del self.clients[user_id]

    def broadcast_system_message(self, message):
        for client_info in self.clients.values():
            try:
                client_info['ws'].send(json.dumps({
                    'message': message,
                    'timestamp': datetime.now().isoformat(),
                    'type': 'system'
                }))
            except Exception:
                continue

    def run(self, host='0.0.0.0', port=5000, debug=True):
        self.app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    chat_server = ChatServer()
    chat_server.run(host='192.168.56.1', port=5000, debug=True)
