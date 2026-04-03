# MentorMetrics 🚀

**MentorMetrics** is an AI-powered platform designed to evaluate, analyze, and dramatically improve mentorship and teaching sessions. By combining advanced audio processing, visual analysis, and LLM-driven personalized coaching, MentorMetrics helps educators understand their strengths, weaknesses, and engagement levels with pinpoint accuracy.

## ✨ Features

- **🎤 Upload & Live Coaching:** Record live sessions or upload existing video/audio files for deep analysis.
- **🧠 Hyper-Personalized AI Reports:** Utilizing Google's Gemini models, generate highly detailed coaching reports that anchor feedback to specific transcript moments and teaching concepts.
- **📊 Multi-Modal Analytics:** 
  - **Audio:** Tracks Words Per Minute (WPM), silence ratios, and vocal clarity.
  - **Visual:** Analyzes face visibility, gaze direction, and gesturing using MediaPipe.
- **📜 Interactive Transcript & Timeline:** Clickable transcripts synced to the video, complete with AI-generated milestones and color-coded engagement tracking.
- **💬 AI Coach Chatbot:** Context-aware assistant that answers questions specifically based on your session's performance.

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 16.2 (App Router), React 19
- **Styling:** Tailwind CSS 4
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Data Fetching:** React Query

### Backend
- **Framework:** FastAPI (Python)
- **AI Models:** Google Generative AI (Gemini), OpenAI Whisper (Transcription), MediaPipe (Pose/Face detection)
- **Database & Storage:** Supabase (PostgreSQL, Auth, Storage Buckets)

---

## 🚀 Getting Started (Local Development)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/MentorMetrics.git
cd MentorMetrics/mentor-metrics
```

### 2. Frontend Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The app will be available at [http://localhost:3000](http://localhost:3000).

### 3. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Create a `.env` file inside the `backend` directory:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   DATABASE_URL=your_postgres_url
   GEMINI_API_KEY=your_gemini_api_key
   ```
4. Run the FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The API will be available at [http://localhost:8000](http://localhost:8000).

---

## ☁️ Deployment Guide

### Deploying the Frontend to Vercel

The Next.js frontend is fully optimized for **Vercel** deployment.

1. Push your code to GitHub.
2. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New Project**.
3. Import your `MentorMetrics` repository.
4. **Important Framework Settings:** Make sure the **Framework Preset** is set to `Next.js`. 
5. Add your Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_BASE_URL` *(Set this to your deployed backend URL, e.g., `https://your-backend.onrender.com`)*
6. Click **Deploy**.

### Deploying the Backend

**⚠️ Important Note for Vercel Deployment:** 
Because the Python backend relies on heavy ML packages like `opencv-python`, `openai-whisper`, and `mediapipe`, the dependencies far exceed Vercel's Serverless Function size limit (250MB). **Do not deploy the FastAPI backend to Vercel.**

Instead, deploy the backend to a containerized or VM-based provider such as:
- **Render** (Web Service)
- **Railway**
- **Fly.io**
- **DigitalOcean App Platform**

**Basic Deployment Steps (e.g., Render):**
1. Connect your GitHub repo to a new Web Service.
2. Set the Root Directory to `backend`.
3. Set the Build Command to `pip install -r requirements.txt`.
4. Set the Start Command to `uvicorn main:app --host 0.0.0.0 --port $PORT`.
5. Add all your `.env` variables to the Environment section.
6. Once deployed, update your Vercel frontend's `NEXT_PUBLIC_API_BASE_URL` to point to the new backend URL.