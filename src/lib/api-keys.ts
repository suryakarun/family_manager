export const getGeminiApiKey = () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('Gemini API key not found');
    }
    return apiKey;
};