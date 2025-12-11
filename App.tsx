import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import McqGenerator from './components/McqGenerator';
import { AppView } from './types';
import { Menu } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('mcq');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleViewChange = (view: AppView) => {
    setCurrentView(view);
    // Close sidebar after navigation on mobile
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'mcq':
        return <McqGenerator />;
      default:
        return <McqGenerator />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 lg:flex">
      <Sidebar
        currentView={currentView}
        onChangeView={handleViewChange}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="lg:hidden p-4 bg-white border-b border-slate-200 flex items-center gap-4 sticky top-0 z-20">
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 p-1 rounded-md hover:bg-slate-100">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center font-bold text-sm text-white">Q</div>
            <span className="font-bold text-lg tracking-tight">QuizWizard</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
           {/* API Key Warning Overlay (if env missing) */}
           {!process.env.API_KEY && (
             <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-8">
               <div className="bg-white p-8 rounded-2xl max-w-lg text-center">
                 <h2 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h2>
                 <p className="text-slate-600 mb-6">
                   No API Key detected. Please ensure <code>process.env.API_KEY</code> is correctly configured in your environment to use the Gemini Enterprise services.
                 </p>
                 <div className="text-sm bg-slate-100 p-4 rounded text-left font-mono">
                   API_KEY=your_gemini_api_key
                 </div>
               </div>
             </div>
          )}
          
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;
