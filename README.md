# Luna AI

Luna is a full-stack chat app:
- Frontend: React + Vite + Tailwind
- Backend: Express router for three model paths
  - GPT: Groq (`openai/gpt-oss-120b`)
  - NVIDIA: OpenRouter (`nvidia/nemotron-3-nano-30b-a3b:free`)
  - GLM 4.3: NVIDIA Integrate API (`z-ai/glm4.7`)

Both model routes use the same Luna personality system prompt with concise-professional response defaults.

## Prerequisites
- Node.js 20+
- Groq API key
- OpenRouter API key
- NVIDIA API key (for GLM path)

## Setup
1. Install frontend deps:
   ```bash
   npm install
   ```
2. Install backend deps:
   ```bash
   cd server
   npm install
   ```
3. Configure backend env in `server/.env`:
   ```env
   OPENROUTER_API_KEY=your_openrouter_key
   OPENROUTER_MODEL=nvidia/nemotron-3-nano-30b-a3b:free
   GROQ_API_KEY=your_groq_key
   GROQ_MODEL=openai/gpt-oss-120b
   NVIDIA_API_KEY=your_nvidia_key
   NVIDIA_GLM_MODEL=z-ai/glm4.7
   PORT=5000
   ```

## Run
1. Start backend:
   ```bash
   cd server
   npm start
   ```
2. In a second terminal, start frontend:
   ```bash
   npm run dev
   ```

## Chat Features
- Choose `GPT`, `NVIDIA`, or `GLM 4.3` before each message.
- Chat history is stored locally.
- Use `Export` to download current thread JSON.
- Use `Clear` to reset current thread.
