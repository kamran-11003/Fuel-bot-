# Fuel Complaint System - WhatsApp Bot 🇵🇰

A WhatsApp-based Fuel Complaint System for citizens in Pakistan. Users can report fuel-related issues like shortages, overpricing, pump closures, and illegal practices through an interactive WhatsApp conversation.

## Features

- 🤖 **Interactive WhatsApp Bot** - Conversational UI with buttons and lists
- 🇵🇰 **Bilingual Support** - Urdu-English mix for Pakistani users
- 📍 **Location Sharing** - Accept WhatsApp location or text addresses
- 📷 **Image Upload** - Optional photo evidence
- 🔒 **CNIC Validation** - 13-digit Pakistani CNIC validation
- 🚫 **Spam Prevention** - 24-hour cooldown per CNIC
- 📊 **Admin API** - REST endpoints for complaint management

## Tech Stack

- **Backend**: Node.js + Express (plain JavaScript)
- **Database**: Supabase (PostgreSQL + Storage)
- **WhatsApp**: Meta WhatsApp Cloud API
- **Frontend**: Plain HTML/CSS/JS prototype

## Project Structure

```
fuel-bot/
├── index.js              # Express server, webhook routes
├── package.json          # Dependencies
├── .env.example          # Environment variables template
├── src/
│   ├── handler.js        # State machine & conversation routing
│   ├── session.js        # Supabase session persistence
│   ├── strings.js        # Bilingual bot messages
│   ├── seed.js           # Constants, validators, helpers
│   └── whatsapp.js       # WhatsApp API helpers
└── public/
    └── index.html        # WhatsApp UI prototype
```

## Conversation Flow

1. **GREETING** - Welcome message with Yes/No buttons
2. **CNIC_INPUT** - 13-digit CNIC validation
3. **REGION_SELECTION** - Select from Islamabad, Rawalpindi, Lahore, Karachi, Other
4. **COMPLAINT_TYPE** - Fuel shortage, Overpricing, Pump closed, Illegal practices, Other
5. **DETAILS_INPUT** - Free text complaint description
6. **LOCATION_INPUT** - WhatsApp location or text address
7. **IMAGE_UPLOAD** - Optional photo (with Skip button)
8. **REVIEW** - Summary with Submit/Edit options
9. **CONFIRMATION** - Success message with Complaint ID

## Setup Instructions

### 1. Clone and Install

```bash
cd "Fuel bot"
npm install
```

### 2. Setup Supabase

Create a new Supabase project and run this SQL to create tables:

```sql
-- User Sessions Table
CREATE TABLE user_sessions (
  id BIGSERIAL PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  state VARCHAR(50) DEFAULT 'GREETING',
  cnic VARCHAR(13),
  region VARCHAR(100),
  complaint_type VARCHAR(100),
  details TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_text TEXT,
  image_url TEXT,
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Complaints Table
CREATE TABLE complaints (
  id BIGSERIAL PRIMARY KEY,
  complaint_code VARCHAR(20) UNIQUE,
  phone_number VARCHAR(20) NOT NULL,
  cnic VARCHAR(13) NOT NULL,
  region VARCHAR(100) NOT NULL,
  complaint_type VARCHAR(100) NOT NULL,
  details TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_text TEXT,
  image_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster CNIC lookups
CREATE INDEX idx_complaints_cnic ON complaints(cnic);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_sessions_phone ON user_sessions(phone_number);
```

**Create Storage Bucket:**

1. Go to Storage in Supabase dashboard
2. Create a new bucket named `complaint-images`
3. Set it to public (or configure policies as needed)

### 3. Setup WhatsApp Cloud API

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app or use existing one
3. Add WhatsApp product
4. Get your Phone Number ID and Access Token from WhatsApp > API Setup
5. Set up webhook URL: `https://your-domain.com/webhook`
6. Subscribe to `messages` webhook field

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_ACCESS_TOKEN=your-token
WEBHOOK_VERIFY_TOKEN=your-custom-verify-token
```

### 5. Run the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 6. Expose to Internet (for development)

Use ngrok or similar to expose your local server:

```bash
ngrok http 3000
```

Update your WhatsApp webhook URL to the ngrok URL.

## API Endpoints

### Webhook

- `GET /webhook` - Meta webhook verification
- `POST /webhook` - Incoming WhatsApp messages

### Admin API

- `GET /api/complaints` - List all complaints
- `GET /api/complaints/:id` - Get complaint by ID
- `PATCH /api/complaints/:id/status` - Update status (pending, in_progress, resolved, rejected)

### Frontend

- `GET /` - WhatsApp UI prototype

## Complaint Types

| ID | Display |
|----|---------|
| fuel_shortage | Fuel shortage ⛽ |
| overpricing | Overpricing 💰 |
| pump_closed | Pump closed 🚫 |
| illegal_practices | Illegal practices ⚖️ |
| other | Other 📝 |

## Regions

- Islamabad
- Rawalpindi
- Lahore
- Karachi
- Other

## Complaint Statuses

- `pending` - New complaint
- `in_progress` - Being investigated
- `resolved` - Issue addressed
- `rejected` - Invalid complaint

## Validation Rules

- **CNIC**: Exactly 13 digits (non-digits are stripped)
- **Details**: Minimum 10 characters
- **Spam Prevention**: 24-hour cooldown per CNIC
- **Location**: WhatsApp location or text address (min 10 chars)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business phone number ID |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp API access token |
| `WEBHOOK_VERIFY_TOKEN` | Custom token for webhook verification |

## Message Templates

All messages are stored in `src/strings.js` with bilingual Urdu-English content. Examples:

```javascript
WELCOME: `Assalam-o-Alaikum! 🇵🇰

Welcome to the *Fuel Complaint System*.

Aap yahan apni fuel-related complaint register kar sakte hain.

Kya aap shuru karna chahte hain?`
```

## License

ISC
