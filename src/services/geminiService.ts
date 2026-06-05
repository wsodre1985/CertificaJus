import { GoogleGenerativeAI } from "@google/generative-ai";

// Environment variables
const openRouterKey = (import.meta.env?.VITE_OPENROUTER_API_KEY) || (import.meta.env?.OPENROUTER_API_KEY) || (typeof process !== 'undefined' ? (process.env?.VITE_OPENROUTER_API_KEY || process.env?.OPENROUTER_API_KEY) : "") || "";
const aiModel = (import.meta.env?.VITE_AI_MODEL) || (typeof process !== 'undefined' ? process.env?.VITE_AI_MODEL : "") || "openai/gpt-4o-mini";
const geminiApiKey = (import.meta.env?.VITE_GEMINI_API_KEY) || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : "") || "";

export const genAI = new GoogleGenerativeAI(geminiApiKey || "placeholder-key");

export async function extractDataFromImage(base64Data: string, type: 'id' | 'warrant', mimeType: string = "image/jpeg"): Promise<any> {
  const prompt = type === 'id' 
    ? "Extraia o NOME COMPLETO e o CPF desta imagem de documento de identidade. Retorne apenas um JSON válido e puro com os campos 'nome' e 'cpf'. Não escreva mais nada além do JSON. Se não encontrar um campo, deixe em branco."
    : "Extraia o NÚMERO DO PROCESSO JUDICIAL, a DATA da audiência e a HORA da audiência deste mandado/documento judicial. Retorne apenas um JSON válido e puro com os campos 'numeroProcesso', 'dataAudiencia' (formato DD/MM/AAAA) e 'horaAudiencia' (formato HH:MM). Não escreva mais nada além do JSON. Se não encontrar um campo, deixe em branco.";

  // Limpa o prefixo base64 se existir
  const base64Clean = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

  // Se o OpenRouter Key estiver configurado, usa a API do OpenRouter
  if (openRouterKey) {
    try {
      console.log(`Usando OpenRouter com o modelo: ${aiModel}`);
      const imageUrl = `data:${mimeType};base64,${base64Clean}`;
      
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openRouterKey}`,
          "HTTP-Referer": "https://certificajus.jus.br",
          "X-Title": "CertificaJus"
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl
                  }
                }
              ]
            }
          ],
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter HTTP ${response.status}: ${errorText}`);
      }

      const resJson = await response.json();
      let content = resJson.choices?.[0]?.message?.content || "{}";
      
      // Limpa blocos de código markdown se o modelo encapsulou em JSON
      content = content.replace(/```json\n?/gi, '').replace(/```/g, '').trim();

      // Encontra o primeiro '{' e o último '}'
      const startIndex = content.indexOf('{');
      const endIndex = content.lastIndexOf('}');
      
      if (startIndex !== -1 && endIndex !== -1) {
        content = content.substring(startIndex, endIndex + 1);
      }

      console.log("Resposta OpenRouter:", content);
      return JSON.parse(content);

    } catch (e: any) {
      console.error("Erro ao processar com a API do OpenRouter:");
      console.error(e?.message || e);
      if (typeof window !== 'undefined') {
        alert("Erro do OpenRouter: " + (e?.message || JSON.stringify(e)));
      }
      return {};
    }
  }

  // Caso contrário, cai de volta para a API do Gemini tradicional
  if (!geminiApiKey) {
    console.error("Nenhuma chave de API (OpenRouter ou Gemini) configurada.");
    if (typeof window !== 'undefined') {
      alert("Erro: Nenhuma chave de API (OpenRouter ou Gemini) foi configurada no arquivo .env.local");
    }
    return {};
  }

  try {
    console.log("Usando API do Gemini como fallback (gemini-2.5-flash)");
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
          temperature: 0.1,
      }
    });

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
    
    content = content.replace(/```json\n?/gi, '').replace(/```/g, '').trim();

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

