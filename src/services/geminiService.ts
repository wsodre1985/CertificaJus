import { GoogleGenerativeAI } from "@google/generative-ai";

// Support both AI Studio Build environment and standard Vite/Vercel environment
// @ts-ignore
const apiKey = (import.meta.env?.VITE_GEMINI_API_KEY) || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : "") || "";

export const genAI = new GoogleGenerativeAI(apiKey);

export async function extractDataFromImage(base64Data: string, type: 'id' | 'warrant', mimeType: string = "image/jpeg"): Promise<any> {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash", // Use a model capable of vision
    generationConfig: {
        temperature: 0.1,
    }
  });
  
  const prompt = type === 'id' 
    ? "Extraia o NOME COMPLETO e o CPF desta imagem de documento de identidade. Retorne apenas um JSON válido e puro com os campos 'nome' e 'cpf'. Não escreva mais nada além do JSON. Se não encontrar um campo, deixe em branco."
    : "Extraia o NÚMERO DO PROCESSO JUDICIAL, a DATA da audiência e a HORA da audiência deste mandado/documento judicial. Retorne apenas um JSON válido e puro com os campos 'numeroProcesso', 'dataAudiencia' (formato DD/MM/AAAA) e 'horaAudiencia' (formato HH:MM). Não escreva mais nada além do JSON. Se não encontrar um campo, deixe em branco.";

  // A API do Gemini exige a string base64 pura, sem o prefixo "data:image/png;base64,"
  const base64Clean = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

  try {
    const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Clean,
            mimeType: mimeType
          }
        }
    ]);

    let content = result.response.text() || "{}";
    
    // Clean markdown code blocks if the model wrapped the JSON
    content = content.replace(/```json\n?/gi, '').replace(/```/g, '').trim();

    // Find the first '{' and last '}'
    const startIndex = content.indexOf('{');
    const endIndex = content.lastIndexOf('}');
    
    if (startIndex !== -1 && endIndex !== -1) {
      content = content.substring(startIndex, endIndex + 1);
    }

    console.log("Resposta Gemini:", content);
    return JSON.parse(content);
  } catch (e: any) {
    console.error("Erro ao processar com a API do Gemini:");
    console.error(e?.message || e);
    if (typeof window !== 'undefined') {
      alert("Erro do Gemini: " + (e?.message || JSON.stringify(e)));
    }
    return {};
  }
}
