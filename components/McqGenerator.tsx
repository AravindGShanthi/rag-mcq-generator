import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, BookOpen, Layers, Zap, Settings, Share2, Copy, ExternalLink, X, ClipboardList, RotateCcw, XCircle, Pencil, Eye, Trash2, Plus, Save } from 'lucide-react';
import { generateMcqsFromDocument } from '../services/geminiService';
import { McqQuestion } from '../types';

const McqGenerator: React.FC = () => {
  const [file, setFile] = useState<{ name: string; type: string; base64: string } | null>(null);
  const [difficulty, setDifficulty] = useState<number>(5);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<McqQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Quiz State
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<number[]>([]);
  
  // Human in the Loop (HITL) State
  const [isEditMode, setIsEditMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate type: Only PDF and Word allowed
    const allowedTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Unsupported file type. Please upload a PDF or Word document.");
      return;
    }

    // Convert to Base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      setFile({
        name: selectedFile.name,
        type: selectedFile.type,
        base64: base64String
      });
      setError(null);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleGenerate = async () => {
    if (!file) {
      setError("Please upload a document first.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setQuestions([]);
    setUserAnswers({});
    setValidationErrors([]);
    setIsSubmitted(false);
    setIsEditMode(false);

    try {
      const results = await generateMcqsFromDocument(file.base64, file.type, difficulty, questionCount, topic);
      setQuestions(results);
      // Automatically enter edit mode (Human in the Loop) after generation
      setIsEditMode(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Quiz Interaction Handlers ---
  const handleOptionSelect = (questionId: number, option: string) => {
    if (isSubmitted || isEditMode) return;
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
    
    // Clear validation error if exists
    if (validationErrors.includes(questionId)) {
      setValidationErrors(prev => prev.filter(id => id !== questionId));
    }
  };

  const handleSubmitQuiz = () => {
    // Validate that all questions have answers
    const errors = questions
      .filter(q => !userAnswers[q.id])
      .map(q => q.id);

    if (errors.length > 0) {
      setValidationErrors(errors);
      // Scroll to the first error
      const firstErrorEl = document.getElementById(`question-${errors[0]}`);
      if (firstErrorEl) {
        firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetQuiz = () => {
    setIsSubmitted(false);
    setUserAnswers({});
    setValidationErrors([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Human in the Loop (Editor) Handlers ---
  const handleUpdateQuestion = (id: number, field: keyof McqQuestion, value: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleUpdateOption = (qId: number, optIndex: number, newValue: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      
      const oldOptionValue = q.options[optIndex];
      const newOptions = [...q.options];
      newOptions[optIndex] = newValue;
      
      // If the edited option was the correct answer, update the correct answer reference too
      let newCorrectAnswer = q.correctAnswer;
      if (q.correctAnswer === oldOptionValue) {
        newCorrectAnswer = newValue;
      }

      return { ...q, options: newOptions, correctAnswer: newCorrectAnswer };
    }));
  };

  const handleSetCorrectAnswer = (qId: number, optionValue: string) => {
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, correctAnswer: optionValue } : q));
  };

  const handleDeleteQuestion = (id: number) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleAddQuestion = () => {
    const newId = Math.max(...questions.map(q => q.id), 0) + 1;
    setQuestions(prev => [...prev, {
      id: newId,
      question: "New Question",
      options: ["Option 1", "Option 2", "Option 3", "Option 4"],
      correctAnswer: "Option 1",
      explanation: "Explanation here.",
      difficulty: "Medium"
    }]);
    setIsEditMode(true);
    // Scroll to bottom after render
    setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  // --- Export Logic ---
  const getGoogleAppsScript = () => {
    const questionsJSON = JSON.stringify(questions.map(q => ({
      text: q.question,
      options: q.options,
      correct: q.correctAnswer,
      explanation: q.explanation
    })), null, 2).replace(/`/g, '\\`'); 
    
    const safeTopic = (topic || "Generated Quiz").replace(/"/g, '\\"').replace(/`/g, '\\`');

    return `function createQuizWizardQuiz() {
  try {
    // 1. Create a new Google Form
    var title = "QuizWizard: ${safeTopic}";
    var form = FormApp.create(title);
    
    form.setDescription("Generated by QuizWizard AI.\\nDifficulty Level: ${difficulty}/10\\nSource: ${file?.name || 'Uploaded Document'}");
    form.setIsQuiz(true);
    form.setConfirmationMessage("Thank you for completing the assessment!");

    var questions = ${questionsJSON};

    // 2. Add Questions
    questions.forEach(function(q, index) {
      var item = form.addMultipleChoiceItem();
      item.setTitle((index + 1) + ". " + q.text);
      
      var choices = q.options.map(function(opt) {
        return item.createChoice(opt, opt === q.correct);
      });
      
      item.setChoices(choices);
      item.setPoints(1); 
      item.setRequired(true);

      if (q.explanation) {
        var feedback = FormApp.createFeedback()
          .setText(q.explanation)
          .build();
        item.setFeedbackForCorrect(feedback);
        item.setFeedbackForIncorrect(feedback);
      }
    });

    Logger.log("\\nSUCCESS! Form Created.");
    Logger.log("Edit URL: " + form.getEditUrl());
    Logger.log("Published URL: " + form.getPublishedUrl());
    
  } catch (e) {
    Logger.log("Error: " + e.toString());
  }
}`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getGoogleAppsScript());
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Calculate score
  const correctCount = questions.filter(q => userAnswers[q.id] === q.correctAnswer).length;
  const scorePercentage = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 h-full bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Zap className="text-blue-600" />
            Quiz Generation Studio
          </h1>
          <p className="text-slate-600 text-base md:text-lg">
            Transform any document into a ready-to-use quiz. Instantly generate questions and use our powerful editor to perfect them.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Panel: Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-500" /> Source Document
              </h3>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  file ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                />
                
                {file ? (
                  <div className="text-center">
                    <FileText className="w-10 h-10 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-800 truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-green-600 mt-1">Ready for analysis</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-600">Click to upload</p>
                    <p className="text-xs text-slate-400 mt-1">PDF or DOCX supported</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-500" /> Configuration
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Focus Topic (Optional)</label>
                  <input 
                    type="text" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Thermodynamics, Sales Cycle..."
                    className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                     <label className="text-sm font-medium text-slate-700">Number of Questions</label>
                     <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{questionCount}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="20" 
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>1</span>
                    <span>20</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-medium text-slate-700">Difficulty Level</label>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{difficulty}/10</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={difficulty}
                    onChange={(e) => setDifficulty(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Elementary</span>
                    <span>PhD</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !file}
              className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-white shadow-lg transition-all transform active:scale-95 ${
                isGenerating || !file
                  ? 'bg-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Agents Working...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Generate Assessment
                </>
              )}
            </button>
            
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>

          {/* Right Panel: Results */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-800">Generated Assessment</h2>
              <div className="flex items-center gap-2 self-start sm:self-center">
                {questions.length > 0 && (
                  <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center shadow-sm">
                    <button
                      onClick={() => { setIsEditMode(true); setIsSubmitted(false); setValidationErrors([]); }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        isEditMode ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Pencil className="w-4 h-4" />
                      Editor
                    </button>
                    <button
                      onClick={() => setIsEditMode(false)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        !isEditMode ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                  </div>
                )}

                {questions.length > 0 && (
                    <button 
                      onClick={() => setShowExportModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Share2 className="w-4 h-4" />
                      Export
                    </button>
                )}
              </div>
            </div>

            {/* Score Banner (Visible only after submission in Preview mode) */}
            {isSubmitted && !isEditMode && questions.length > 0 && (
              <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-4">
                <div>
                    <h3 className="text-xl font-bold mb-1">Quiz Results</h3>
                    <p className="text-slate-300 text-sm">You scored <span className="text-white font-bold">{correctCount}</span> out of <span className="text-white font-bold">{questions.length}</span></p>
                </div>
                <div className={`text-3xl font-black ${scorePercentage >= 70 ? 'text-green-400' : 'text-amber-400'}`}>
                    {scorePercentage}%
                </div>
              </div>
            )}

            {questions.length === 0 && !isGenerating && (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl h-96 flex flex-col items-center justify-center text-center text-slate-400 p-4">
                <BookOpen className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">No questions generated yet</p>
                <p className="text-sm max-w-sm mt-2">Upload a document and configure the agents to begin the RAG process.</p>
              </div>
            )}

            {isGenerating && (
               <div className="space-y-4">
                 {[1, 2, 3].map(i => (
                   <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-pulse">
                     <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
                     <div className="space-y-2">
                       <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                       <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                       <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                     </div>
                   </div>
                 ))}
               </div>
            )}

            <div className="space-y-6 pb-12">
              {questions.map((q, idx) => {
                // --- Editor Mode Rendering ---
                if (isEditMode) {
                  return (
                    <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border-2 border-slate-200 hover:border-blue-300 transition-colors group">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
                          Question {idx + 1}
                        </span>
                        <div className="flex gap-2">
                            <select 
                                value={q.difficulty}
                                onChange={(e) => handleUpdateQuestion(q.id, 'difficulty', e.target.value)}
                                className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                            >
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                            </select>
                            <button 
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                                title="Delete Question"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Question Text</label>
                        <textarea
                            value={q.question}
                            onChange={(e) => handleUpdateQuestion(q.id, 'question', e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-800 font-medium resize-y min-h-[80px]"
                        />
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <label className="block text-xs font-semibold text-slate-500">Options (Select radio for correct answer)</label>
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-3">
                            <input
                              type="radio"
                              name={`correct-${q.id}`}
                              checked={q.correctAnswer === opt}
                              onChange={() => handleSetCorrectAnswer(q.id, opt)}
                              className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleUpdateOption(q.id, oIdx, e.target.value)}
                              className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Explanation</label>
                        <textarea
                            value={q.explanation}
                            onChange={(e) => handleUpdateQuestion(q.id, 'explanation', e.target.value)}
                            className="w-full p-3 bg-blue-50/50 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 text-sm resize-y min-h-[60px]"
                            placeholder="Explain why the answer is correct..."
                        />
                      </div>
                    </div>
                  );
                }

                // --- Preview Mode Rendering ---
                const userAnswer = userAnswers[q.id];
                const isCorrect = userAnswer === q.correctAnswer;
                const isError = validationErrors.includes(q.id);
                
                return (
                  <div 
                    key={q.id} 
                    id={`question-${q.id}`}
                    className={`bg-white p-6 rounded-xl shadow-sm border transition-colors ${isError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question {idx + 1}</span>
                        {isError && (
                          <span className="text-red-600 text-xs font-bold flex items-center gap-1">
                             <AlertCircle className="w-3 h-3" />
                             Required field
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        q.difficulty === 'Hard' ? 'bg-red-100 text-red-700' : 
                        q.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {q.difficulty}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">{q.question}</h3>
                    
                    <div className="space-y-2 mb-4">
                      {q.options.map((opt, oIdx) => {
                        const isSelected = userAnswer === opt;
                        const isOptCorrect = q.correctAnswer === opt;
                        
                        let optionClass = "bg-white border-slate-200 text-slate-700 hover:bg-slate-50";
                        let icon = <div className={`w-5 h-5 rounded-full border-2 ${isError ? 'border-red-300' : 'border-slate-300'}`} />;

                        if (!isSubmitted) {
                          if (isSelected) {
                             optionClass = "bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500";
                             icon = <div className="w-5 h-5 rounded-full border-[6px] border-blue-600" />;
                          } else if (isError) {
                             optionClass = "bg-white border-red-200 text-slate-700 hover:bg-red-50";
                          }
                        } else {
                          if (isOptCorrect) {
                             optionClass = "bg-green-50 border-green-500 text-green-900";
                             icon = <CheckCircle className="w-5 h-5 text-green-600" />;
                          } else if (isSelected && !isOptCorrect) {
                             optionClass = "bg-red-50 border-red-500 text-red-900";
                             icon = <XCircle className="w-5 h-5 text-red-600" />;
                          } else {
                             optionClass = "opacity-50 grayscale";
                          }
                        }

                        return (
                          <div 
                            key={oIdx} 
                            onClick={() => handleOptionSelect(q.id, opt)}
                            className={`p-4 rounded-lg border text-sm flex items-center gap-3 transition-all ${optionClass} ${!isSubmitted ? 'cursor-pointer' : ''}`}
                          >
                            <div className="flex-shrink-0">
                              {icon}
                            </div>
                            <span className="font-medium">{opt}</span>
                          </div>
                        );
                      })}
                    </div>

                    {isSubmitted && (
                       <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 animate-in fade-in">
                         <span className="font-bold mr-1">Explanation:</span> {q.explanation}
                       </div>
                    )}
                  </div>
                );
              })}
              
              {/* Add Question Button (Editor Only) */}
              {isEditMode && questions.length > 0 && (
                <button
                    onClick={handleAddQuestion}
                    className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all font-semibold"
                >
                    <Plus className="w-5 h-5" />
                    Add Manual Question
                </button>
              )}

              {/* Quiz Actions (Preview Only) */}
              {!isEditMode && questions.length > 0 && (
                 <div className="pt-4">
                    {!isSubmitted ? (
                      <button 
                        onClick={handleSubmitQuiz}
                        className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg shadow-lg transition-all bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30"
                      >
                         <CheckCircle className="w-5 h-5" />
                         Submit Assessment
                      </button>
                    ) : (
                      <button 
                        onClick={handleResetQuiz}
                        className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 shadow-sm transition-all"
                      >
                         <RotateCcw className="w-5 h-5" />
                         Reset Quiz
                      </button>
                    )}
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Google Forms Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-purple-600" />
                 </div>
                 <div>
                   <h3 className="text-xl font-bold text-slate-900">Export to Google Forms</h3>
                   <p className="text-xs text-slate-500">Automated Apps Script Generator</p>
                 </div>
               </div>
               <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-lg transition-colors">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
               <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                 <h4 className="font-bold text-blue-900 text-sm mb-2">Instructions</h4>
                 <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                    <li>Click <strong className="font-semibold">Copy Script</strong> below.</li>
                    <li>Open <a href="https://script.new" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600 inline-flex items-center gap-1">Google Apps Script <ExternalLink className="w-3 h-3" /></a> in a new tab.</li>
                    <li>Paste the code into the editor and click the <strong>Run</strong> (▶) button.</li>
                    <li>Grant permissions when asked. The console will show the link to your new Form.</li>
                 </ol>
               </div>
               
               <div className="relative group">
                  <div className="absolute top-0 right-0 p-2 flex gap-2">
                    <button 
                      onClick={handleCopyCode} 
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition-all ${
                        copySuccess 
                          ? 'bg-green-500 text-white' 
                          : 'bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {copySuccess ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copySuccess ? 'Copied!' : 'Copy Script'}
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-slate-300 p-4 pt-12 rounded-lg text-xs font-mono overflow-x-auto h-64 shadow-inner border border-slate-800 selection:bg-blue-500 selection:text-white">
                     <code>{getGoogleAppsScript()}</code>
                  </pre>
               </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end">
              <button 
                onClick={() => setShowExportModal(false)}
                className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default McqGenerator;
