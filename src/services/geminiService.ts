import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function extractDataFromImage(base64Image: string, type: 'id' | 'warrant'): Promise<any> {
  const model = "gemini-3-flash-preview";
  
  const prompt = type === 'id' 
    ? "Extraia o NOME COMPLETO e o CPF desta imagem de documento de identidade. Retorne apenas um JSON com os campos 'nome' e 'cpf'. Se não encontrar, deixe em branco."
    : "Extraia o NÚMERO DO PROCESSO JUDICIAL, a DATA da audiência e a HORA da audiência deste mandado/documento judicial. Retorne apenas um JSON com os campos 'numeroProcesso', 'dataAudiencia' (formato DD/MM/AAAA) e 'horaAudiencia' (formato HH:MM). Se não encontrar, deixe em branco.";

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: type === 'id' ? {
        type: Type.OBJECT,
        properties: {
          nome: { type: Type.STRING },
          cpf: { type: Type.STRING }
        }
      } : {
        type: Type.OBJECT,
        properties: {
          numeroProcesso: { type: Type.STRING },
          dataAudiencia: { type: Type.STRING },
          horaAudiencia: { type: Type.STRING }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Erro ao parsear resposta do Gemini", e);
    return {};
  }
}
