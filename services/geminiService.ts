import { GoogleGenAI, Modality } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
if (!apiKey) throw new Error("Thiếu VITE_GEMINI_API_KEY (Vercel → Settings → Environment Variables).");
const ai = new GoogleGenAI({ apiKey });


export async function generateSpeech(text: string, voiceName: string, tonePrefix: string): Promise<string> {
  try {
    const prompt = `${tonePrefix}${text}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("APIからオーディオデータが返されませんでした。");
    }

    return base64Audio;
  } catch (error) {
    console.error("音声生成エラー:", error);
    throw new Error("音声の生成中にエラーが発生しました。");
  }
}
