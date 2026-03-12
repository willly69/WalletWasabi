import React, { useState } from 'react';
import { Download, Mail, MessageSquare, Send, Phone, Video, Settings, CheckCircle, AlertCircle } from 'lucide-react';

const AssistantSystemGenerator = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedServices, setSelectedServices] = useState({
    email: true,
    slack: true,
    telegram: true,
    sms: true,
    video: true
  });

  const files = {
    // Main configuration
    'docker-compose.yml': `version: '3.8'

services:
  # Email Agent
  email_agent:
    build: .
    container_name: email_agent
    environment:
      - SERVICE_TYPE=email
    env_file:
      - ./config/.env
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config
    restart: unless-stopped
    command: python -m email_agent.main

  # Slack Agent
  slack_agent:
    build: .
    container_name: slack_agent
    environment:
      - SERVICE_TYPE=slack
    env_file:
      - ./config/.env
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config
    restart: unless-stopped
    command: python -m slack_agent.main

  # Telegram Agent
  telegram_agent:
    build: .
    container_name: telegram_agent
    environment:
      - SERVICE_TYPE=telegram
    env_file:
      - ./config/.env
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config
    restart: unless-stopped
    command: python -m telegram_agent.main

  # Twilio SMS/WhatsApp Agent
  twilio_agent:
    build: .
    container_name: twilio_agent
    environment:
      - SERVICE_TYPE=twilio
    env_file:
      - ./config/.env
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config
    restart: unless-stopped
    command: python -m twilio_agent.main

  # Unified API Server
  api_server:
    build: .
    container_name: api_server
    environment:
      - SERVICE_TYPE=api
    env_file:
      - ./config/.env
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config
    ports:
      - "8000:8000"
    restart: unless-stopped
    command: uvicorn api.main:app --host 0.0.0.0 --port 8000`,

    'Dockerfile': `FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    gcc \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p /app/logs

CMD ["python", "-m", "api.main"]`,

    'requirements.txt': `# Core dependencies
openai>=1.12.0
anthropic>=0.18.0
fastapi>=0.109.0
uvicorn>=0.27.0
python-dotenv>=1.0.0
pydantic>=2.5.0
aiohttp>=3.9.0

# Email
imaplib2>=3.6
python-email>=0.1.3
email-validator>=2.1.0

# Slack
slack-sdk>=3.26.0
slack-bolt>=1.18.0

# Telegram
python-telegram-bot>=20.7

# Twilio (SMS/WhatsApp)
twilio>=8.11.0

# Video Generation
requests>=2.31.0

# Utilities
python-dateutil>=2.8.2
pytz>=2023.3
pyyaml>=6.0.1
tenacity>=8.2.3`,

    'config/.env.template': `# ===========================================
# AI PERSONAL ASSISTANT - CONFIGURATION
# ===========================================
# Copy this to .env and fill in your values

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-turbo-preview

# Anthropic Claude (alternative)
ANTHROPIC_API_KEY=your_anthropic_key_here
USE_CLAUDE=false

# Email Configuration
EMAIL_ADDRESS=your.email@gmail.com
EMAIL_PASSWORD=your_app_password_here
EMAIL_IMAP_SERVER=imap.gmail.com
EMAIL_SMTP_SERVER=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_CHECK_INTERVAL=300

# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_SIGNING_SECRET=your_signing_secret

# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_ALLOWED_USERS=123456789,987654321

# Twilio Configuration (SMS/WhatsApp)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# Video Generation (Optional)
RUNWAY_API_KEY=your_runway_key
PIKA_API_KEY=your_pika_key
ELEVENLABS_API_KEY=your_elevenlabs_key

# Notification Settings
SLACK_NOTIFICATION_WEBHOOK=your_slack_webhook_for_notifications
ENABLE_NOTIFICATIONS=true

# Logging
LOG_LEVEL=INFO
LOG_TO_FILE=true`,

    'tone_profile/style.yaml': `# Your Personal Writing Style Profile
# This ensures all AI responses match your communication style

name: "Personal Assistant Tone"
version: "1.0"

# Core Characteristics
tone:
  formality: "casual-professional"  # Options: formal, professional, casual-professional, casual, friendly
  emotion: "warm"                   # Options: neutral, warm, enthusiastic, empathetic
  brevity: "concise"                # Options: very-brief, concise, balanced, detailed

# Writing Style
style:
  greeting: "Hi" or "Hey"           # Your typical greeting
  closing: "Best" or "Thanks"       # Your typical sign-off
  punctuation: "moderate"           # Options: minimal, moderate, expressive
  emojis: "occasional"              # Options: none, rare, occasional, frequent

# Language Preferences
language:
  complexity: "simple"              # Options: simple, moderate, sophisticated
  jargon: "minimal"                 # Options: none, minimal, moderate, technical
  contractions: true                # Use "I'm" vs "I am"
  active_voice: true                # Prefer active over passive voice

# Response Patterns
patterns:
  apologize_when: "necessary"       # When to say sorry
  ask_questions: "when-helpful"     # Clarifying questions
  provide_options: true             # Offer multiple solutions
  summarize_long_threads: true      # Recap in long conversations

# Example Messages (for AI to learn from)
examples:
  - "Hey! Just saw your message. I can definitely help with that. Let me know if Tuesday at 2pm works?"
  - "Thanks for reaching out! I'll look into this and get back to you by EOD."
  - "Quick update: I'm running about 15 mins late. Should be there soon!"

# Auto-reply Rules
auto_reply:
  max_length: 150                   # Max words in response
  always_personalize: true          # Use recipient's name
  mirror_tone: true                 # Match sender's formality level
  suggest_meeting_times: true       # For scheduling requests`,

    'email_agent/main.py': `import imaplib
import smtplib
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import time
import logging
from datetime import datetime
import yaml
from email_agent.classifier import EmailClassifier
from email_agent.responder import EmailResponder
from email_agent.utils import send_slack_notification

logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'INFO'),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/email_agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class EmailAgent:
    def __init__(self):
        self.email_address = os.getenv('EMAIL_ADDRESS')
        self.password = os.getenv('EMAIL_PASSWORD')
        self.imap_server = os.getenv('EMAIL_IMAP_SERVER', 'imap.gmail.com')
        self.smtp_server = os.getenv('EMAIL_SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('EMAIL_SMTP_PORT', 587))
        self.check_interval = int(os.getenv('EMAIL_CHECK_INTERVAL', 300))

        # Load tone profile
        with open('tone_profile/style.yaml', 'r') as f:
            self.tone_profile = yaml.safe_load(f)

        self.classifier = EmailClassifier()
        self.responder = EmailResponder(self.tone_profile)

    def connect_imap(self):
        """Connect to IMAP server"""
        try:
            mail = imaplib.IMAP4_SSL(self.imap_server)
            mail.login(self.email_address, self.password)
            return mail
        except Exception as e:
            logger.error(f"IMAP connection failed: {e}")
            return None

    def connect_smtp(self):
        """Connect to SMTP server"""
        try:
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.email_address, self.password)
            return server
        except Exception as e:
            logger.error(f"SMTP connection failed: {e}")
            return None

    def fetch_unread_emails(self, mail):
        """Fetch unread emails"""
        try:
            mail.select('INBOX')
            status, messages = mail.search(None, 'UNSEEN')
            email_ids = messages[0].split()

            emails = []
            for email_id in email_ids:
                status, msg_data = mail.fetch(email_id, '(RFC822)')
                msg = email.message_from_bytes(msg_data[0][1])
                emails.append({
                    'id': email_id,
                    'from': msg.get('From'),
                    'subject': msg.get('Subject'),
                    'body': self.get_email_body(msg),
                    'message': msg
                })

            return emails
        except Exception as e:
            logger.error(f"Error fetching emails: {e}")
            return []

    def get_email_body(self, msg):
        """Extract email body"""
        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    body = part.get_payload(decode=True).decode()
                    break
        else:
            body = msg.get_payload(decode=True).decode()
        return body

    def send_reply(self, to_address, subject, body, in_reply_to=None):
        """Send email reply"""
        try:
            server = self.connect_smtp()
            if not server:
                return False

            msg = MIMEMultipart()
            msg['From'] = self.email_address
            msg['To'] = to_address
            msg['Subject'] = f"Re: {subject}"

            if in_reply_to:
                msg['In-Reply-To'] = in_reply_to
                msg['References'] = in_reply_to

            msg.attach(MIMEText(body, 'plain'))

            server.send_message(msg)
            server.quit()

            logger.info(f"Sent reply to {to_address}")
            return True
        except Exception as e:
            logger.error(f"Error sending reply: {e}")
            return False

    def process_email(self, email_data):
        """Process a single email"""
        try:
            # Classify email
            category = self.classifier.classify(
                email_data['from'],
                email_data['subject'],
                email_data['body']
            )

            logger.info(f"Email classified as: {category}")

            # Skip OTPs, no-reply, spam
            if category in ['otp', 'noreply', 'spam']:
                logger.info(f"Skipping {category} email")
                return

            # Generate reply
            reply_text = self.responder.generate_reply(
                sender=email_data['from'],
                subject=email_data['subject'],
                body=email_data['body'],
                category=category
            )

            # Send reply
            success = self.send_reply(
                to_address=email_data['from'],
                subject=email_data['subject'],
                body=reply_text,
                in_reply_to=email_data['message'].get('Message-ID')
            )

            if success and os.getenv('ENABLE_NOTIFICATIONS') == 'true':
                send_slack_notification(
                    f"📧 Auto-replied to email from {email_data['from']}"
                )

        except Exception as e:
            logger.error(f"Error processing email: {e}")

    def run(self):
        """Main loop"""
        logger.info("Email Agent started")

        while True:
            try:
                mail = self.connect_imap()
                if mail:
                    emails = self.fetch_unread_emails(mail)
                    logger.info(f"Found {len(emails)} unread emails")

                    for email_data in emails:
                        self.process_email(email_data)

                    mail.logout()

                time.sleep(self.check_interval)

            except KeyboardInterrupt:
                logger.info("Email Agent stopped by user")
                break
            except Exception as e:
                logger.error(f"Error in main loop: {e}")
                time.sleep(60)

if __name__ == "__main__":
    agent = EmailAgent()
    agent.run()`,

    'SETUP.md': `# AI Personal Assistant - Complete Setup Guide

## Prerequisites
- Python 3.11+
- Docker & Docker Compose
- Git

## Quick Start (5 minutes)

### 1. Clone & Setup
\`\`\`bash
git clone <your-repo>
cd assistant_system
cp config/.env.template config/.env
\`\`\`

### 2. Get API Keys

#### OpenAI (Required)
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Add to \`.env\`: \`OPENAI_API_KEY=sk-...\`

#### Email (Gmail)
1. Enable 2FA on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Generate app password for "Mail"
4. Add to \`.env\`:
   - \`EMAIL_ADDRESS=your@gmail.com\`
   - \`EMAIL_PASSWORD=generated-app-password\`

#### Slack
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name it "Personal Assistant"
4. Enable Socket Mode
5. Add Bot Token Scopes: \`chat:write\`, \`channels:history\`, \`im:history\`
6. Install to workspace
7. Add to \`.env\`:
   - \`SLACK_BOT_TOKEN=xoxb-...\`
   - \`SLACK_APP_TOKEN=xapp-...\`

#### Telegram
1. Message @BotFather on Telegram
2. Send \`/newbot\`
3. Follow prompts to create bot
4. Copy token to \`.env\`: \`TELEGRAM_BOT_TOKEN=...\`
5. Get your user ID from @userinfobot
6. Add to \`.env\`: \`TELEGRAM_ALLOWED_USERS=your-user-id\`

#### Twilio (SMS/WhatsApp)
1. Sign up at https://www.twilio.com/try-twilio
2. Get free trial credits
3. Go to Console → Account Info
4. Add to \`.env\`:
   - \`TWILIO_ACCOUNT_SID=...\`
   - \`TWILIO_AUTH_TOKEN=...\`
   - \`TWILIO_PHONE_NUMBER=+1...\`

### 3. Customize Your Tone
Edit \`tone_profile/style.yaml\` with your writing style

### 4. Launch
\`\`\`bash
docker-compose up -d
\`\`\`

### 5. Verify
\`\`\`bash
docker-compose logs -f
\`\`\`

## Testing Each Service

### Email
Send test email to your configured address

### Slack
Message your bot directly or mention it in a channel

### Telegram
Send message to your bot

### SMS
Text your Twilio number

## API Endpoints
- Health: \`http://localhost:8000/health\`
- Email reply: \`POST http://localhost:8000/reply/email\`
- Generate script: \`POST http://localhost:8000/script/generate\`

## Troubleshooting

### Email not working
- Check app password (not regular password)
- Verify IMAP/SMTP enabled in Gmail settings

### Slack not responding
- Verify bot is in channel
- Check Socket Mode is enabled
- Review bot scopes

### Telegram silent
- Ensure bot token is correct
- Verify your user ID in allowed list

## Logs
\`\`\`bash
tail -f logs/email_agent.log
tail -f logs/slack_agent.log
tail -f logs/telegram_agent.log
\`\`\`

## Stopping Services
\`\`\`bash
docker-compose down
\`\`\`
`
  };

  const services = [
    {
      id: 'email',
      name: 'Email Agent',
      icon: Mail,
      color: 'bg-blue-500',
      features: ['Auto-reply', 'Smart filtering', 'Meeting scheduling']
    },
    {
      id: 'slack',
      name: 'Slack Bot',
      icon: MessageSquare,
      color: 'bg-purple-500',
      features: ['DM replies', 'Channel monitoring', 'Custom tone']
    },
    {
      id: 'telegram',
      name: 'Telegram Bot',
      icon: Send,
      color: 'bg-cyan-500',
      features: ['Instant replies', 'User whitelist', 'Rich formatting']
    },
    {
      id: 'sms',
      name: 'SMS/WhatsApp',
      icon: Phone,
      color: 'bg-green-500',
      features: ['Text replies', 'WhatsApp support', 'Twilio integration']
    },
    {
      id: 'video',
      name: 'Video Generator',
      icon: Video,
      color: 'bg-red-500',
      features: ['Script writing', 'AI video', 'Voiceover']
    }
  ];

  const downloadProject = () => {
    const fileContents = Object.entries(files)
      .map(([path, content]) => `=== ${path} ===\n\n${content}\n\n`)
      .join('\n');

    const blob = new Blob([fileContents], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assistant_system_files.txt';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            AI Personal Assistant System
          </h1>
          <p className="text-xl text-gray-300">
            Complete multi-platform automation suite
          </p>
        </div>

        {/* Service Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {services.map(service => {
            const Icon = service.icon;
            return (
              <div key={service.id} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-white/40 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`${service.color} p-3 rounded-lg`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-semibold">{service.name}</h3>
                </div>
                <ul className="space-y-2">
                  {service.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle size={16} className="text-green-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <div className="flex border-b border-white/20">
            {['overview', 'setup', 'files'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 py-4 font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-white/20 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-8">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-semibold mb-3">What's Included</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      'Email auto-reply with smart filtering',
                      'Slack bot with custom tone matching',
                      'Telegram bot with user authentication',
                      'SMS/WhatsApp via Twilio integration',
                      'AI video script generator',
                      'Video creation with AI platforms',
                      'Unified REST API server',
                      'Docker deployment ready',
                      'Custom tone profile system',
                      'Centralized logging',
                      'Slack notifications',
                      'Meeting time suggestions'
                    ].map((feature, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle size={20} className="text-green-400 mt-1 flex-shrink-0" />
                        <span className="text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-blue-400 mt-1" size={24} />
                    <div>
                      <h4 className="font-semibold mb-2">Setup Required</h4>
                      <p className="text-sm text-gray-300">
                        You'll need to create accounts and get API keys for each service.
                        The setup guide below walks you through every step.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'setup' && (
              <div className="space-y-6">
                <div className="prose prose-invert max-w-none">
                  <pre className="bg-black/40 rounded-lg p-6 overflow-x-auto text-sm">
                    {files['SETUP.md']}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'files' && (
              <div className="space-y-4">
                <p className="text-gray-300 mb-4">
                  Complete project structure with all configuration files:
                </p>
                <div className="grid gap-3">
                  {Object.keys(files).map(filename => (
                    <div key={filename} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm text-blue-300">{filename}</span>
                        <span className="text-xs text-gray-400">
                          {files[filename].split('\n').length} lines
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Download Button */}
        <div className="mt-8 text-center">
          <button
            onClick={downloadProject}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
          >
            <Download size={24} />
            Download Complete Project
          </button>
          <p className="text-sm text-gray-400 mt-3">
            All files, configs, and documentation included
          </p>
        </div>

        {/* Next Steps */}
        <div className="mt-12 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-8 border border-white/20">
          <h3 className="text-2xl font-semibold mb-4">Next Steps</h3>
          <ol className="space-y-3 text-gray-300">
            <li>1. Download the project files above</li>
            <li>2. Follow the setup guide to get all API keys</li>
            <li>3. Customize your tone profile in <code className="bg-black/40 px-2 py-1 rounded">tone_profile/style.yaml</code></li>
            <li>4. Run <code className="bg-black/40 px-2 py-1 rounded">docker-compose up -d</code> to start all services</li>
            <li>5. Test each platform and adjust settings as needed</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default AssistantSystemGenerator;
