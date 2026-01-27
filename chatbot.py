import re
import random
from datetime import datetime
from flask import Flask, request, jsonify, session
from functools import wraps

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-in-production'

# Conversation history storage (in-memory, resets on restart)
conversations = {}

# Extended responses with categories and multiple options for variety
responses = {
    # Greetings
    "hello": ["Hi there! How can I help you today?", "Hello! What can I do for you?", "Hey! Nice to see you!"],
    "hi": ["Hello! How can I assist you?", "Hi there! What's on your mind?", "Hey! How can I help?"],
    "hey": ["Hey! What's up?", "Hello there!", "Hi! How can I help you today?"],
    "good morning": ["Good morning! Hope you're having a great start to your day!", "Morning! How can I help?"],
    "good afternoon": ["Good afternoon! How can I assist you?", "Afternoon! What can I do for you?"],
    "good evening": ["Good evening! How may I help you?", "Evening! What brings you here?"],

    # Farewells
    "bye": ["Goodbye! Have a great day!", "See you later!", "Take care!"],
    "goodbye": ["Goodbye! Come back anytime!", "See you soon!", "Farewell!"],
    "see you": ["See you later!", "Bye for now!", "Until next time!"],
    "take care": ["You too! Goodbye!", "Take care! See you soon!"],

    # How are you variations
    "how are you": ["I'm just a bot, but I'm functioning perfectly! How are you?", "Doing great, thanks for asking! How about you?"],
    "how are you?": ["I'm just a bot, but thanks for asking!", "Running smoothly! How can I help?"],
    "how's it going": ["Going well! What can I do for you?", "All systems operational! How about you?"],
    "what's up": ["Not much, just here to help! What's up with you?", "Ready to assist! What's on your mind?"],

    # About the bot
    "who are you": ["I'm a friendly chatbot here to assist you!", "I'm your helpful assistant bot!"],
    "what are you": ["I'm a chatbot built with Flask and Python!", "I'm an AI assistant ready to help!"],
    "what can you do": ["I can chat with you, tell jokes, give you the time, and more! Try asking me something!",
                       "I can answer questions, tell jokes, and have a conversation. What would you like to know?"],

    # Help
    "help": ["Here's what I can do:\n- Chat and greet\n- Tell jokes\n- Give current time/date\n- Answer basic questions\nJust type naturally!",
             "I'm here to help! Try saying hello, asking for a joke, or asking for the time!"],

    # Jokes
    "tell me a joke": [
        "Why do programmers prefer dark mode? Because light attracts bugs!",
        "Why did the developer go broke? Because he used up all his cache!",
        "There are only 10 types of people in the world: those who understand binary and those who don't.",
        "A SQL query walks into a bar, walks up to two tables and asks, 'Can I join you?'",
        "Why do Java developers wear glasses? Because they can't C#!"
    ],
    "joke": [
        "Why was the computer cold? It left its Windows open!",
        "What's a computer's favorite snack? Microchips!",
        "Why did the programmer quit his job? Because he didn't get arrays!"
    ],

    # Gratitude
    "thank you": ["You're welcome!", "Happy to help!", "Anytime!"],
    "thanks": ["You're welcome!", "No problem!", "Glad I could help!"],

    # Affirmations
    "yes": ["Great!", "Okay!", "Alright!"],
    "no": ["Okay, no problem!", "Alright!", "That's fine!"],
    "okay": ["Okay!", "Alright then!", "Sure!"],

    # Fun
    "tell me something interesting": [
        "Did you know? Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that was still edible!",
        "Fun fact: Octopuses have three hearts and blue blood!",
        "Here's a cool fact: A group of flamingos is called a 'flamboyance'!"
    ],
    "i'm bored": [
        "How about I tell you a joke? Just ask!",
        "Want to hear an interesting fact? Just ask me to tell you something interesting!",
        "We could chat! Tell me about your day!"
    ]
}

# Pattern-based responses for flexible matching
patterns = [
    (r"my name is (\w+)", lambda m: f"Nice to meet you, {m.group(1)}! How can I help you today?"),
    (r"i am (\w+)", lambda m: f"Hello, {m.group(1)}! What can I do for you?"),
    (r"what is (\d+) (\+|\-|\*|\/) (\d+)", lambda m: calculate(m)),
    (r"calculate (\d+) (\+|\-|\*|\/) (\d+)", lambda m: calculate(m)),
    (r"(.*)(weather)(.*)", lambda m: "I'm sorry, I don't have access to weather data, but I hope it's nice where you are!"),
    (r"(.*)(love you)(.*)", lambda m: "That's sweet! I appreciate you too!"),
    (r"(.*)(sorry)(.*)", lambda m: "No need to apologize! How can I help you?"),
]

def calculate(match):
    """Perform basic arithmetic operations."""
    num1 = int(match.group(1))
    operator = match.group(2)
    num2 = int(match.group(3))

    operations = {
        '+': num1 + num2,
        '-': num1 - num2,
        '*': num1 * num2,
        '/': num1 / num2 if num2 != 0 else "undefined (division by zero)"
    }
    result = operations.get(operator, "unknown operation")
    return f"{num1} {operator} {num2} = {result}"

def get_time_response():
    """Get current time response."""
    now = datetime.now()
    return f"The current time is {now.strftime('%I:%M %p')}."

def get_date_response():
    """Get current date response."""
    now = datetime.now()
    return f"Today is {now.strftime('%A, %B %d, %Y')}."

def find_response(user_input):
    """Find the best response for user input."""
    user_input_lower = user_input.lower().strip()

    # Check for time/date queries
    if any(word in user_input_lower for word in ['time', "what's the time", 'what time']):
        return get_time_response()

    if any(word in user_input_lower for word in ['date', "what's the date", 'what day', 'today']):
        return get_date_response()

    # Check exact matches first
    if user_input_lower in responses:
        return random.choice(responses[user_input_lower])

    # Check for partial matches in responses
    for key in responses:
        if key in user_input_lower or user_input_lower in key:
            return random.choice(responses[key])

    # Check pattern-based responses
    for pattern, response_func in patterns:
        match = re.search(pattern, user_input_lower)
        if match:
            return response_func(match)

    # Default response
    default_responses = [
        "I'm not sure I understand. Could you rephrase that?",
        "Sorry, I don't quite get that. Try asking something else!",
        "Hmm, I'm not sure about that. Type 'help' to see what I can do!",
        "I don't have a response for that, but I'm always learning!"
    ]
    return random.choice(default_responses)

def get_conversation_id():
    """Get or create a conversation ID."""
    if 'conversation_id' not in session:
        session['conversation_id'] = datetime.now().strftime('%Y%m%d%H%M%S%f')
    return session['conversation_id']

@app.route('/chat', methods=['POST'])
def chat():
    """Main chat endpoint."""
    try:
        data = request.json
        if not data or 'message' not in data:
            return jsonify({"error": "No message provided"}), 400

        user_input = data.get('message', '').strip()
        if not user_input:
            return jsonify({"error": "Empty message"}), 400

        # Get response
        response_message = find_response(user_input)

        # Store conversation history
        conv_id = get_conversation_id()
        if conv_id not in conversations:
            conversations[conv_id] = []
        conversations[conv_id].append({
            "timestamp": datetime.now().isoformat(),
            "user": user_input,
            "bot": response_message
        })

        return jsonify({
            "response": response_message,
            "conversation_id": conv_id
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/chat/history', methods=['GET'])
def get_history():
    """Get conversation history for current session."""
    conv_id = get_conversation_id()
    history = conversations.get(conv_id, [])
    return jsonify({
        "conversation_id": conv_id,
        "history": history,
        "message_count": len(history)
    })

@app.route('/chat/clear', methods=['POST'])
def clear_history():
    """Clear conversation history for current session."""
    conv_id = get_conversation_id()
    if conv_id in conversations:
        del conversations[conv_id]
    session.pop('conversation_id', None)
    return jsonify({"message": "Conversation history cleared"})

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_conversations": len(conversations)
    })

@app.route('/responses', methods=['GET'])
def list_responses():
    """List all available response triggers (for debugging/admin)."""
    return jsonify({
        "exact_triggers": list(responses.keys()),
        "pattern_count": len(patterns),
        "special_features": ["time", "date", "calculator"]
    })

if __name__ == '__main__':
    print("Starting Enhanced Chatbot Server...")
    print("Endpoints:")
    print("  POST /chat - Send a message")
    print("  GET  /chat/history - View conversation history")
    print("  POST /chat/clear - Clear conversation history")
    print("  GET  /health - Health check")
    print("  GET  /responses - List available triggers")
    app.run(debug=True, port=5000)
