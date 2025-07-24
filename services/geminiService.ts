// Usando 'require' para a importação, que é mais robusto para certos tipos de módulos.
const { GoogleGenerativeAI } = require('@google/genai');

// Gera o texto do post usando a IA do Google
export async function generatePostContent(prompt: string): Promise<string> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key do Google Gemini não encontrada.");
    }
    
    // O resto do código funciona da mesma forma
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
}
