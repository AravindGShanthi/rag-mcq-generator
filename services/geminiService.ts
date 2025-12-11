import { GoogleGenAI, Type } from "@google/genai";
import { McqQuestion, ImageSize } from "../types";

// Helper for type-safe environment variable access
const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (!key) {
    console.error("API Key not found in environment");
    return "";
  }
  return key;
};

// --- Chat Service ---
export const streamChatMessage = async function* (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string
) {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  // Mapping 'model' role to Gemini 'model' role, 'user' to 'user'
  const chatHistory = history.map(h => ({
    role: h.role,
    parts: h.parts
  }));

  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    history: chatHistory,
    config: {
      systemInstruction: "You are a helpful, intelligent AI assistant for an enterprise education platform.",
      // Enable thinking for the chat assistant to improve response quality
      thinkingConfig: { thinkingBudget: 2048 }
    },
  });

  const result = await chat.sendMessageStream({ message: newMessage });

  for await (const chunk of result) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
};

// --- Image Generation Service ---
export const generateImage = async (prompt: string, size: ImageSize): Promise<string> => {
  // Check for paid key selection (required for gemini-3-pro-image-preview)
  // @ts-ignore - aistudio is injected globally in the specific environment
  if (window.aistudio && window.aistudio.hasSelectedApiKey && window.aistudio.openSelectKey) {
     // @ts-ignore
     const hasKey = await window.aistudio.hasSelectedApiKey();
     if (!hasKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        // Race condition mitigation: Proceed immediately assuming success, per instructions
     }
  }

  // Create new instance to ensure we capture the selected key if applicable
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        imageSize: size,
        aspectRatio: "1:1" 
      }
    }
  });

  // Extract image
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No image generated.");
};

// --- RAG / MCQ Generator Service (Multi-Agent Architecture) ---
export const generateMcqsFromDocument = async (
  fileBase64: string, 
  mimeType: string, 
  difficulty: number,
  questionCount: number,
  topicContext: string
): Promise<McqQuestion[]> => {
  
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  // System Instruction defining the Multi-Agent Persona Hierarchy
  const systemInstruction = `
    You are an advanced, production-grade Multi-Agent RAG System designed for high-stakes educational assessment creation.
    
    Your architecture consists of four specialized AI agents working in a strictly defined workflow:
    
    1. **Reader Agent (The Analyst)**: 
       - Capability: Deep semantic analysis of documents.
       - Goal: Extract specific facts, definitions, and relationships relevant to the user's requested topic and difficulty.
       - Constraints: Must ONLY use information present in the uploaded document. Zero outside knowledge hallucination.
    
    2. **Teacher Agent (The Creator)**:
       - Capability: Pedagogical question design (Bloom's Taxonomy).
       - Goal: Create drafted MCQs based *exclusively* on the Reader's extracted facts.
       - Constraints: Create plausible distractors. Ensure questions match the difficulty level (1-10).
    
    3. **Critic Agent (The Reviewer)**:
       - Capability: Fact-checking and logic verification.
       - Goal: Ruthlessly critique the Teacher's questions. 
       - Actions: 
         - Verify the Correct Answer is explicitly supported by the text.
         - Check if distractors are clearly incorrect but educational.
         - Reject any question that relies on external knowledge.
         - Refine phrasing for clarity.
    
    4. **Formatter Agent (The Engineer)**:
       - Capability: Structured Data Output.
       - Goal: Convert the finalized, critiqued questions into the strict JSON schema required.
       
    You will execute this pipeline step-by-step as prompted by the Orchestrator (User).
  `;

  try {
    // Initialize Chat with the Document injected into History
    // This effectively grounds the entire session on the document.
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      history: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: mimeType, data: fileBase64 } },
            { text: "System Initialization: Source Document Uploaded. Awaiting agent activation." }
          ]
        },
        {
          role: 'model',
          parts: [{ text: "System Ready. Document ingested. Agents are on standby." }]
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        // Enable thinking with a higher budget to improve multi-agent reasoning capabilities 
        thinkingConfig: { thinkingBudget: 10000 } 
      },
    });

    // --- Step 1: Reader Agent ---
    // Extract facts to ground the generation.
    const readerPrompt = `
      [ACTIVATE: Reader Agent]
      
      Analyze the uploaded document.
      Target Topic: "${topicContext || "General Overview"}"
      Difficulty Level: ${difficulty}/10
      
      Task:
      1. Scan the document for key concepts matching the topic.
      2. Extract ${questionCount + 3} distinct facts or logical segments that are suitable for forming questions.
      3. Quote the specific text segment for each fact to ensure grounding.
      
      Output your analysis as a structured list of facts.
    `;
    
    await chat.sendMessage({ message: readerPrompt });

    // --- Step 2: Teacher Agent ---
    // Draft questions based on the facts.
    const teacherPrompt = `
      [ACTIVATE: Teacher Agent]
      
      Based *strictly* on the Reader Agent's analysis above:
      Draft ${questionCount} multiple-choice questions.
      
      Requirements:
      - Difficulty: ${difficulty}/10.
      - Each question must have 4 options.
      - Mark the correct answer.
      - Provide a brief explanation referencing the source text.
      
      Do not format as JSON yet. Focus on content quality and pedagogical value.
    `;
    
    await chat.sendMessage({ message: teacherPrompt });

    // --- Step 3: Critic Agent ---
    // Verify and fix.
    const criticPrompt = `
      [ACTIVATE: Critic Agent]
      
      Review the drafted questions.
      
      Checklist:
      1. Is the answer 100% supported by the extracted facts?
      2. Are the distractors non-ambiguous?
      3. Is the difficulty level appropriate?
      
      If a question fails, REWRITE it completely using the source text.
      Confirm the final set of ${questionCount} valid questions.
    `;
    
    await chat.sendMessage({ message: criticPrompt });

    // --- Step 4: Formatter Agent ---
    // JSON Output.
    const formatterPrompt = `
      [ACTIVATE: Formatter Agent]
      
      Output the final verified questions in the required JSON schema.
      Ensure exactly ${questionCount} questions.
    `;

    const response = await chat.sendMessage({
      message: formatterPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  question: { type: Type.STRING },
                  options: { 
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.STRING, description: "Must match one of the options exactly" },
                  explanation: { type: Type.STRING },
                  difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] }
                },
                required: ["id", "question", "options", "correctAnswer", "explanation", "difficulty"]
              }
            }
          }
        }
      }
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);
    return data.questions || [];

  } catch (e) {
    console.error("Multi-Agent Generation Failed", e);
    throw new Error("Failed to generate valid MCQs. The document might be too large or complex for the agent pipeline. Error: " + (e instanceof Error ? e.message : String(e)));
  }
};