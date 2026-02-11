<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/13fOBwrYcMD2sMHmbj4suVmx_nD_FwnBe

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` with backend AI settings:
   - Example:
   - `GROQ_API_KEY=your_key_here`
   - `GROQ_MODEL=llama-3.3-70b-versatile`
   - Optional:
   - `API_PORT=8787`
3. Run the app:
   `npm run dev`
   - This starts both:
   - Frontend (Vite)
   - Backend API (`/api/interview/questions`, `/api/interview/evaluate`, `/api/interview/chat`)
