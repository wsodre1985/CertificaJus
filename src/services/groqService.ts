import Groq from "groq-sdk";

// Support both AI Studio Build environment and standard Vite/Vercel environment
// @ts-ignore
const apiKey = (import.meta.env?.VITE_GROQ_API_KEY) || (typeof process !== 'undefined' ? process.env?.GROQ_API_KEY : "") || "";

const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

export async function extractDataFromImage(base64Data: string, type: 'id' | 'warrant', mimeType: string = "image/jpeg"): Promise<any> {
  const model = "llama-4-scout-17b-16e-instruct";
  
  const prompt = type === 'id' 
    ? "Extraia o NOME COMPLETO e o CPF desta imagem de documento de identidade. Retorne apenas um JSON com os campos 'nome' e 'cpf'. Se não encontrar, deixe em branco."
    : "Extraia o NÚMERO DO PROCESSO JUDICIAL, a DATA da audiência e a HORA da audiência deste mandado/documento judicial. Retorne apenas um JSON com os campos 'numeroProcesso', 'dataAudiencia' (formato DD/MM/AAAA) e 'horaAudiencia' (formato HH:MM). Se não encontrar, deixe em branco.";

  // Groq requires base64 images in URL format: `data:${mimeType};base64,${data}`
  const dataUrl = base64Data.includes(',') ? base64Data : `data:${mimeType};base64,${base64Data}`;

  try {
    const response = await groq.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: dataUrl
              }
            }
          ]
        }
      ],
      temperature: 0.1
    });

    let content = response.choices[0]?.message?.content || "{}";
    
    // Clean markdown code blocks if the model wrapped the JSON
    content = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();

    // Sometimes LlaMA can respond with some intro text before the JSON, find the first '{' and last '}'
    const startIndex = content.indexOf('{');
    const endIndex = content.lastIndexOf('}');
    
    if (startIndex !== -1 && endIndex !== -1) {
      content = content.substring(startIndex, endIndex + 1);
    }

    console.log("Resposta Groq:", content);
    return JSON.parse(content);
  } catch (e: any) {
    console.error("Erro ao processar com a API do Groq:");
    console.error(e?.message || e);
    // Temporary alert to debug exact error from Groq
    if (typeof window !== 'undefined') {
      alert("Erro do Groq: " + (e?.message || JSON.stringify(e)));
    }
    return {};
  }
}
