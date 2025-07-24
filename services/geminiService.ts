import { GoogleGenAI } from "@google/genai";

// Inicializa a IA fora da função para ser reutilizada
const apiKey = process.env.API_KEY;
if (!apiKey) {
    throw new Error("API Key do Google Gemini não encontrada nas variáveis de ambiente.");
}
const ai = new GoogleGenAI({ apiKey });

// Gera o texto do post usando a IA do Google
export async function generatePostContent(prompt: string): Promise<string> {
    if (!prompt) {
        throw new Error("O prompt para a IA não pode estar vazio.");
    }
    
    try {
        // Usa o modelo mais recente e eficiente
        const model = "gemini-1.5-flash"; 
        
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        
        const responseText = response.text;

        if (!responseText) {
            console.error("A resposta do Gemini estava vazia. Resposta completa:", JSON.stringify(response, null, 2));
            throw new Error("A resposta da IA estava vazia.");
        }

        // Limpa a resposta para garantir que não venha com formatação extra
        let text = responseText.trim();
        if (text.startsWith('```')) {
            text = text.substring(text.indexOf('\n') + 1, text.lastIndexOf('```')).trim();
        }
        
        return text;

    } catch (error) {
        console.error("Erro ao gerar conteúdo com Gemini:", error);
        throw new Error("Não foi possível gerar o conteúdo com a IA.");
    }
}
