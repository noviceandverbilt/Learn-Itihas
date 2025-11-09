import { GoogleGenAI, Modality } from "@google/genai";

let ai: GoogleGenAI | null = null;

const getAI = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};

export interface GenerationResult {
    success: boolean;
    content: string;
}

export const generateNotes = async (topic: string, context: string): Promise<GenerationResult> => {
    try {
        const ai = getAI();
        const prompt = `
        Act as an expert on the given topic. Create a detailed, well-structured, textbook-style chapter.
        
        Topic: "${topic}"
        
        Use the following user-provided context to inform your response. If the context is empty, rely on your general knowledge.
        User Context: """
        ${context || "No context provided."}
        """
        
        The chapter should include:
        1.  An engaging introduction.
        2.  Key concepts and definitions.
        3.  A chronological or thematic breakdown of the topic.
        4.  Important figures, events, and their significance.
        5.  A concluding summary.
        
        Format the output in Markdown. Use headings, bold text, bullet points, and numbered lists to ensure clarity and readability.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });

        return { success: true, content: response.text };
    } catch (error) {
        console.error("Error generating notes:", error);
        return { success: false, content: "Failed to generate notes. Please check the console for details." };
    }
};

export const createTextToSpeech = async (text: string): Promise<string | null> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Read the following text in a clear, narrative style suitable for an educational podcast: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (error) {
        console.error("Error creating text-to-speech:", error);
        return null;
    }
};