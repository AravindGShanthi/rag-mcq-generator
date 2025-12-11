import React from 'react';
import { FileText, X } from 'lucide-react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, setIsOpen = () => {} }) => {
  const menuItems = [
    { id: 'mcq', label: 'RAG MCQ Generator', icon: FileText },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      ></div>

      <aside
        className={`w-64 bg-slate-900 text-white flex-flex-col h-full shadow-xl z-40
                  fixed inset-y-0 left-0
                  transform transition-transform duration-300 ease-in-out
                  lg:relative lg:translate-x-0 lg:h-auto lg:flex-shrink-0
                  ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-lg">Q</div>
                    <span className="font-bold text-xl tracking-tight">QuizWizard</span>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="lg:hidden text-slate-400 p-1 rounded-md hover:bg-slate-700"
                    aria-label="Close sidebar"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>
            <div className="mt-2 text-xs text-slate-400 px-6">AI-Powered Assessments</div>

            <nav className="flex-1 overflow-y-auto py-6 px-3">
                <ul className="space-y-2">
                {menuItems.map((item) => (
                    <li key={item.id}>
                    <button
                        onClick={() => onChangeView(item.id as AppView)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                        currentView === item.id
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                        <span className="font-medium">{item.label}</span>
                    </button>
                    </li>
                ))}
                </ul>
            </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
