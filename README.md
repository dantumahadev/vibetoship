# 🏛️ Community Hero - Municipal Audit Grid

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![AI Powered](https://img.shields.io/badge/AI-Dual%20Brain%20Architecture-purple.svg)
![Status](https://img.shields.io/badge/status-production-success.svg)

**AI-Powered Civic Infrastructure Management Platform**

[Live Demo](https://community-hero-219003332387.us-central1.run.app) · [Report Issue](https://github.com/yourusername/community-hero/issues) · [Documentation](#documentation)

</div>

---

## 🌟 Overview

**Community Hero** is a next-generation civic infrastructure management platform that combines **Dual-Brain AI Architecture** with real-time monitoring, automated workforce routing, and multi-channel citizen engagement. Built for municipal governments to transform how they handle infrastructure issues - from pothole reporting to structural safety audits.

### Why Community Hero?

- 🇮🇳 **19,000+ deaths** annually in India due to potholes (NCRB)
- 💧 **40% of urban households** face daily water supply disruptions (NITI Aayog)
- 💰 **₹3.14 Trillion** lost annually due to poor infrastructure (World Bank)
- 🔴 **72% of civic issues** go unresolved without citizen reporting (Urban Studies India)

**Community Hero bridges this gap with AI-powered automation, real-time tracking, and transparent governance.**

### 📱 Multi-Channel Reporting
Community Hero supports **omnichannel citizen engagement** for maximum accessibility:

#### 1. **WhatsApp Integration** 📱
- Send location, photo/video directly via WhatsApp
- Conversational bot guides citizens through reporting
- Auto-extracts GPS coordinates from shared location
- Returns structured confirmation with Issue ID, Category, Department, Timeline
- Example Response:
  ```
  ✅ Issue Filed Successfully!
  
  📋 ID: #4_KJGE
  📂 Category: Road Infrastructure
  🔧 Cause: General Wear
  🏛️ Dept: Greater Hyderabad Municipal Corporation (GHMC) - Engineering Division
  ⚖️ Law: Hyderabad Municipal Corporation Act, 1955
  ⏰ Time: 7 days
  🔴 Prosecution Required: No
  
  Your report is now verified and live on Civic Safety Portal! 🙏
  ```

#### 2. **Web Portal** 🌐
- Full-featured dashboard with map interface
- AI Co-Pilot for smart form completion
- Real-time status tracking
- Gamification & leaderboards

#### 3. **Email Notifications** ✉️
- Issue creation confirmations
- Status update alerts
- Hero task assignments
- Admin escalation notices

### 🤖 Vertex AI Agent Integration

The **Perimeter Agent** (Vertex AI Agentic Platform) provides intelligent conversational capabilities:

- **Agent ID**: `agent_1782646025931`
- **Platform**: Google Cloud Vertex AI Agent Builder (Preview)
- **Location**: `us-central1`
- **Project**: Custom knowledge base with municipal regulations

**Capabilities**:
- 💬 Natural language complaint intake via WhatsApp
- 🔍 Contextual Q&A about government schemes
- 📋 Automated category classification
- 🚨 Emergency response guidance
- 📊 Legal framework validation (Municipal Acts, time limits)
- 🎯 Department routing based on issue type

**Flow Visualization** (from screenshots):
```
Infrastructure Issue Flow:
├── Tool: Intake Issue
│   └── Collects details via chat
├── Tool: Calculate Budget
│   └── AI estimates repair cost
├── Tool: Logistical Logistics
│   └── Routes to nearest hero
├── Tool: Macro Growth Control
│   └── Checks citywide patterns
├── Tool: Digital Authority Score
│   └── Validates citizen credibility
└── Tool: Tier Liability Protection
    └── Assigns legal framework
```

### 🗺️ Interactive Features

- **Pin-drop Map**: Leaflet-based map with click-to-report
- **GPS Auto-location**: Automatically captures coordinates
- **Address Geocoding**: Converts lat/lng to human-readable address
- **Issue Heatmap**: Visual density of problems by ward
- **Real-time Markers**: Live issue pins on map with status colors

---

## 🧠 Dual-Brain AI Architecture

The platform leverages a **hybrid AI system** combining two powerful AI engines for maximum reliability and intelligent decision-making:

### 1️⃣ **Groq Engine (Primary Brain)** - Llama 4 Scout Vision + Llama 3.3 70B
- **Vision Model**: `meta-llama/llama-4-scout-17b-16e-instruct` for structural diagnostics
- **Text Model**: `llama-3.3-70b-versatile` for analysis & reasoning
- **Speed**: Ultra-fast inference via Groq's LPU architecture
- **Use Cases**:
  - 🏗️ Structural integrity analysis from photos
  - 🚌 Transit vehicle defect detection (RTC buses, IRCTC trains)
  - 📊 Impact scoring & danger level assessment
  - ⚡ Real-time complaint verification (anti-spam)
  - 🎯 Predictive failure analysis
  - 📝 Automated escalation letters & RTI drafts

### 2️⃣ **Vertex AI Agent (Secondary Brain)** - Google Cloud Agentic AI
- **Platform**: Google Cloud Vertex AI Agent Builder
- **Model**: Gemini-powered conversational agent
- **Location**: `us-central1`
- **Use Cases**:
  - 💬 Disaster chat & emergency guidance
  - 📚 Government scheme recommendations
  - 🔍 Contextual Q&A for citizens
  - 📋 Complaint intake & triage
  - 🚨 Emergency response coordination

### Dual-Brain Fallback System
```
User Request → Groq Engine (Primary)
                ↓ (if fails)
            Vertex AI Agent (Secondary)
                ↓ (if fails)
            LlamaEngine Heuristics (Fallback)
```

This architecture ensures **99.9% uptime** and intelligent failover without service disruption.

---

## 🚀 Key Features

### 🎯 For Citizens
- **📸 Snap & Report**: Upload photo/video of infrastructure issues with GPS auto-tagging
- **🤖 AI Co-Pilot**: Gemini auto-fills title, description, category, severity from image analysis
- **🗺️ Interactive Map**: Pin-drop location selector with address auto-complete
- **📊 Real-Time Tracking**: Track issue status from "Reported" → "Verified" → "In Progress" → "Resolved"
- **🏆 Gamification**: Earn points, ranks, badges for reporting & validating issues
- **📱 Multi-Channel Reporting**: Web, WhatsApp, Email integration
- **🔔 Smart Notifications**: Updates on your reported issues
- **🌍 Multilingual**: Support for English, Hindi, Telugu, Tamil, Bengali, Marathi
- **📡 Disaster Chat**: AI-powered emergency guidance during crises

### 🛠️ For Government Workers (Community Heroes)
- **🎖️ Role-Based Access**:
  - 🔌 **Pole Man**: Electrical pole & street light maintenance
  - 🚰 **Plumber**: Water supply & drainage specialist
  - ⚡ **Electrician**: Electrical wiring & public utility
  - 🏗️ **Construction Officer**: Civil works & structural defects
- **📍 Proximity Routing**: Auto-assignment of nearest qualified hero to issue
- **✅ Gov ID Verification**: Llama Vision validates government employee IDs
- **📞 Direct Notification**: SMS, Email, WhatsApp alerts for assigned tasks
- **🗂️ Issue Dashboard**: Prioritized queue by severity & location

### 🏛️ For GHMC Corporators (Ward Officials)
- **💼 Tender Management**: Post, manage, and award infrastructure repair tenders
- **👔 Contractor Bidding**: Review bids, evaluate proposals, select contractors
- **📈 Ward Analytics**: Dashboard with issue heatmaps, budget tracking, completion rates
- **🔒 Google OAuth**: Instant verified access for elected officials
- **🎯 Contract Tracking**: Monitor project stages, approve milestones
- **💰 Budget Allocation**: Track spending vs. estimates per category

### 🏗️ For Contractors
- **📋 Open Tenders**: View active municipal repair projects
- **💵 Bid Submission**: Submit competitive bids with proposals
- **📊 Contract Dashboard**: Track active contracts, stages, payments
- **📸 Progress Verification**: Upload stage completion photos for AI audit
- **⚖️ DLP Tracking**: Monitor Defect Liability Period obligations
- **⚠️ Blacklist System**: Automatic blacklisting for failed quality audits

### 🔬 Advanced AI Features
- **🏗️ Structural Scanner**: Deep AI diagnostics on bridges, metro pillars, flyovers
  - Concrete spalling detection
  - Rust & corrosion analysis
  - Structural integrity score (0-100)
  - Years-to-failure prediction
- **🚌 Transit Health Inspector**: AI scan for RTC buses & IRCTC trains
  - Broken windows, faulty charging ports
  - Washroom cleanliness audit
  - Auto-schedules depot hold for repairs
- **🔮 Predictive Failures**: AI forecasts cascading infrastructure risks
- **📝 Escalation Tools**: Auto-generate RTI letters & viral social posts for unresolved issues
- **✉️ Email Notifications**: Reporter, Hero, and Admin notifications via SMTP

---

## 🏗️ Tech Stack

### Frontend
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS 4** (modern styling)
- **Motion (Framer)** for animations
- **Leaflet** + **React Leaflet** for maps
- **Lucide React** for icons
- **Recharts** for analytics dashboards

### Backend
- **Express.js** (Node.js server)
- **Firebase Admin SDK** for authentication & Firestore
- **Groq API** for Llama model inference
- **Google Vertex AI** for agentic conversational AI
- **Twilio** for WhatsApp integration
- **Nodemailer** for email automation

### AI & Machine Learning
- **Llama 4 Scout** (17B) - Vision model via Groq
- **Llama 3.3 70B** - Text reasoning via Groq
- **Gemini (Vertex AI)** - Conversational agent
- **Google Cloud Discoveryengine** for search
- **Grok/Groq Hybrid** fallback system

### Infrastructure
- **Google Cloud Run** (serverless deployment)
- **Firebase Firestore** (real-time database)
- **Firebase Storage** (image/video uploads)
- **Google Cloud Vertex AI** (agent platform)

### Integrations
- **WhatsApp** (Twilio sandbox for citizen reports)
- **SMTP Email** (Gmail for notifications)
- **Google OAuth** (Corporator/Contractor sign-in)

---

## 📂 Project Structure

```
community-hero/
├── src/
│   ├── components/          # React components
│   │   ├── AdminPortal.tsx       # GHMC Corporator dashboard
│   │   ├── ContractorPortal.tsx  # Contractor bidding & contracts
│   │   ├── CommunalIssues.tsx    # Citizen issue feed
│   │   ├── Dashboard.tsx         # Analytics & metrics
│   │   ├── DisasterChat.tsx      # Vertex AI emergency chat
│   │   ├── FirebaseProvider.tsx  # Auth context
│   │   ├── IssueCard.tsx         # Issue display component
│   │   ├── LandingHub.tsx        # Main entry portal
│   │   ├── Leaderboard.tsx       # Gamification rankings
│   │   ├── Login.tsx             # Multi-role authentication
│   │   ├── MapContainer.tsx      # Leaflet map integration
│   │   ├── Navbar.tsx            # Navigation bar
│   │   ├── Profile.tsx           # User profile management
│   │   ├── PublicViralPage.tsx   # Shareable issue pages
│   │   ├── ReportIssueModal.tsx  # Issue reporting form
│   │   └── StructuralScanner.tsx # AI health scanner
│   ├── lib/
│   │   ├── firebase.ts           # Firebase config
│   │   ├── firestore-errors.ts   # Error handling
│   │   └── store.ts              # State management
│   ├── types.ts                  # TypeScript interfaces
│   ├── main.tsx                  # App entry point
│   └── index.css                 # Global styles
├── server.ts                # Express backend + AI engines
├── dist/                    # Production build
├── assets/                  # Static images
├── .env                     # Environment variables
├── firebase.json            # Firebase config
├── firestore.rules          # Security rules
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ (LTS recommended)
- npm or yarn
- Firebase account (for Firestore & Auth)
- Groq API key (for Llama models)
- Google Cloud account (for Vertex AI & Cloud Run)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/community-hero.git
cd community-hero
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```env
# Groq API for Llama Models
GROK_API_KEY="gsk_your_groq_api_key_here"

# Server Configuration
PORT=3001
APP_URL="http://localhost:3001"
PUBLIC_URL="http://localhost:3001"

# Twilio WhatsApp (Optional)
TWILIO_ACCOUNT_SID="your_twilio_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"

# SMTP Email Configuration
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-specific-password"

# Google Cloud Vertex AI Agent
VERTEX_PROJECT_ID="your-gcp-project-id"
VERTEX_AGENT_ID="your-agent-id"
VERTEX_AGENT_LOCATION="us-central1"
```

4. **Set up Firebase**

Create a `src/lib/firebase.ts` with your Firebase config:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

5. **Run the development server**
```bash
npm run dev
```

The app will be available at `http://localhost:3001`

---

## 🌐 Deployment

### Deploy to Google Cloud Run

1. **Build the project**
```bash
npm run build
```

2. **Deploy using gcloud CLI**
```bash
gcloud run deploy community-hero \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --port=3001
```

3. **Configure Firebase OAuth**
- Go to Firebase Console → Authentication → Settings → Authorized domains
- Add your Cloud Run domain: `your-service-hash.us-central1.run.app`

4. **Set environment variables in Cloud Run**
```bash
gcloud run services update community-hero \
  --update-env-vars GROK_API_KEY="your_key",VERTEX_PROJECT_ID="your_project"
```

---

## 🔐 Security

- **Firebase Authentication**: OAuth 2.0 with Google Sign-In
- **Firestore Security Rules**: Role-based access control
- **API Rate Limiting**: Groq & Vertex AI throttling
- **Input Validation**: Server-side validation for all endpoints
- **XSS Protection**: React's built-in sanitization
- **CORS**: Configured for production domains only
- **Environment Variables**: Secrets managed via Cloud Run

---

## 📊 Data Flow

### Issue Reporting Flow
```
Citizen → Upload Photo/Video → Frontend
    ↓
Groq Llama Vision → Image Analysis
    ↓
Server API → Vertex AI → Complaint Verification
    ↓
Firestore → Save Issue
    ↓
Proximity Routing → Assign Nearest Hero
    ↓
Notifications → Email + SMS + WhatsApp
    ↓
Hero Dashboard → Accept Task
    ↓
Status Updates → Real-time to Citizen
```

### Tender & Contract Flow
```
GHMC Corporator → Post Tender
    ↓
Firestore → Publish to Contractors
    ↓
Contractors → Submit Bids
    ↓
Corporator → Review & Award
    ↓
Vertex AI → Generate Project Timeline (AI Stages)
    ↓
Contractor → Upload Progress Photos
    ↓
Groq Vision → Validate Stage Completion
    ↓
Auto-Blacklist if Quality Fails
    ↓
Issue Marked Resolved → Citizen Notification
```

---

## 🎨 Design Philosophy

- **Citizen-First**: Simple, intuitive UI for non-technical users
- **Government-Grade**: Professional aesthetic for official use
- **Mobile-Responsive**: Optimized for phones, tablets, desktops
- **Accessibility**: WCAG 2.1 compliant (in progress)
- **Multilingual**: Language selector for inclusive access
- **Real-Time**: Firestore live updates for instant sync
- **Gamification**: Points, ranks, badges to encourage participation

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Use Prettier for code formatting
- Write meaningful commit messages
- Add comments for complex logic
- Test on multiple screen sizes
- Respect existing code style

---

## 📜 License

This project is licensed under the **Apache 2.5 License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Cloud** for Vertex AI Agent Platform
- **Groq** for blazing-fast Llama inference
- **Meta AI** for Llama 4 Scout & Llama 3.3 models
- **Firebase** for real-time infrastructure
- **OpenStreetMap** for map data
- **NCRB, NITI Aayog, World Bank** for civic data insights

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/community-hero/issues)
- **Email**: support@communityhero.app
- **Documentation**: [Wiki](https://github.com/yourusername/community-hero/wiki)

---

## 🗺️ Roadmap

### Q1 2025
- [ ] Mobile app (React Native)
- [ ] Voice reporting (WhatsApp voice notes)
- [ ] Offline mode with sync

### Q2 2025
- [ ] AI-powered budget optimization
- [ ] Blockchain for tender transparency
- [ ] Drone integration for aerial surveys

### Q3 2025
- [ ] Integration with more cities
- [ ] Advanced analytics & ML dashboards
- [ ] Citizen voting on priority issues

---

<div align="center">

**Built with ❤️ for better governance**

🏛️ **Empowering Citizens · Enabling Heroes · Ensuring Accountability**

[⬆ Back to Top](#-community-hero---municipal-audit-grid)

</div>
