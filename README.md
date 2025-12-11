<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# QuizWizard AI

## Overview

QuizWizard AI is an intelligent application built with **Google AI Studio - Vibe Coding** that leverages advanced AI capabilities to generate personalized quizzes, create engaging images, and provide intelligent chatbot interactions.

## 📱 Live Project

Try the live application here: [QuizWizard AI - Live Demo](https://ai.studio/apps/drive/14M_hnnQjH381NLJwY4ESsMWSw78xjcox?fullscreenApplet=true)

## 🎥 Video Tutorial

Check out the demo video: [YouTube - QuizWizard AI Demo](https://youtu.be/TjAfWfmL4Js?si=0D6l-38hCgFMtT2j)

## 🛠️ Technologies Used

- **Frontend Framework**: React with TypeScript
- **Build Tool**: Vite
- **AI Integration**: Google Gemini API
- **Styling**: CSS/TailwindCSS
- **Package Manager**: npm

## 📦 Features

- **MCQ Generator**: Automatically generate multiple-choice questions using AI
- **Dashboard**: Comprehensive dashboard for managing all features
- **Responsive UI**: Intuitive sidebar navigation with responsive design

## 🚀 Run Locally

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd quizwizard-ai
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   - Create a `.env.local` file in the root directory
   - Add your Gemini API key:
     ```
     VITE_GEMINI_API_KEY=your_gemini_api_key_here
     ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## 📁 Project Structure

```
quizwizard-ai/
├── components/
│   ├── ChatBot.tsx
│   ├── Dashboard.tsx
│   ├── ImageGenerator.tsx
│   ├── McqGenerator.tsx
│   └── Sidebar.tsx
├── services/
│   └── geminiService.ts
├── App.tsx
├── index.tsx
├── index.html
├── types.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 🔧 Configuration

Make sure to set your Gemini API key in the `.env.local` file before running the application. You can obtain your API key from [Google AI Studio](https://ai.google.dev/).

## 📝 License

This project is part of the AI Studio ecosystem.

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

---

**Built with ❤️ using Google AI Studio - Vibe Coding**
