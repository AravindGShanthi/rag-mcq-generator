import React, { useState } from 'react';
import { Image as ImageIcon, Download, Maximize2, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { generateImage } from '../services/geminiService';
import { GeneratedImage, ImageSize } from '../types';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const base64Url = await generateImage(prompt, imageSize);
      setResult({
        url: base64Url,
        prompt: prompt,
        size: imageSize,
        timestamp: new Date()
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to generate image.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 mb-2">
            <Sparkles className="text-amber-500" />
            Nano Banana Pro Studio
          </h1>
          <p className="text-slate-600">
            Generate high-fidelity assets for your educational materials using the advanced <strong>gemini-3-pro-image-preview</strong> model.
          </p>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-sm text-amber-800">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p>High-resolution (2K/4K) generation requires a funded project API key. You will be prompted to select one if needed.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-6">
            <form onSubmit={handleGenerate} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Image Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the educational diagram or illustration you need..."
                  rows={5}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Resolution</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setImageSize(size)}
                      className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${
                        imageSize === size
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-white shadow-lg transition-all ${
                  isGenerating || !prompt.trim()
                    ? 'bg-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/30'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Synthesizing...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5" />
                    Generate Image
                  </>
                )}
              </button>
            </form>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>

          {/* Preview Area */}
          <div className="lg:col-span-2">
            <div className="bg-slate-200 rounded-2xl h-[500px] border-4 border-white shadow-xl overflow-hidden flex items-center justify-center relative group">
              {result ? (
                <>
                  <img 
                    src={result.url} 
                    alt={result.prompt} 
                    className="w-full h-full object-contain bg-slate-900" 
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <a 
                      href={result.url} 
                      download={`quizwizard-${Date.now()}.png`}
                      className="p-3 bg-white text-slate-900 rounded-full hover:bg-blue-50 transition-colors"
                      title="Download"
                    >
                      <Download className="w-6 h-6" />
                    </a>
                    <button 
                      className="p-3 bg-white text-slate-900 rounded-full hover:bg-blue-50 transition-colors"
                      onClick={() => window.open(result.url, '_blank')}
                      title="Open Full Size"
                    >
                      <Maximize2 className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-mono border border-white/20">
                    {result.size} Resolution
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-400">
                  <div className="w-20 h-20 bg-slate-300 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <ImageIcon className="w-10 h-10 text-white" />
                  </div>
                  <p className="font-medium">Ready to generate</p>
                  <p className="text-sm opacity-70">Enter a prompt to begin</p>
                </div>
              )}
            </div>
            
            {result && (
              <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Prompt Used</h4>
                <p className="text-slate-700 italic">"{result.prompt}"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;