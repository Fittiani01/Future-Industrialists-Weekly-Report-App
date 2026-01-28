import { GoogleGenAI } from "@google/genai";
import { WeeklyReport, Visit } from '../types';

// المفتاح الاحتياطي الخاص بـ Firebase للمشروع (لضمان عدم توقف التطبيق)
const FALLBACK_KEY = "AIzaSyBh61RDyPcpP03Kp7YEyCQhGLP7JhBw-IY";

const getAIClient = () => {
    // 1. نحاول جلب المفتاح من متغيرات البيئة (الأولوية)
    let apiKey = process.env.API_KEY;

    // 2. إذا لم نجد مفتاح في البيئة، نستخدم المفتاح الاحتياطي (لمنع توقف التطبيق)
    if (!apiKey) {
        apiKey = FALLBACK_KEY;
    }

    // 3. حماية إضافية: المكتبة ترفض القيمة الفارغة وتسبب Crash
    // نمرر قيمة نصية حتى لو كانت غير صالحة للسماح للتطبيق بالعمل، ثم نعالج خطأ الاتصال لاحقاً
    const safeKey = apiKey || "dummy_key_to_prevent_crash";

    return new GoogleGenAI({ apiKey: safeKey });
};

// تحسين دالة التنظيف
const cleanJson = (text: string): string => {
    if (!text) return "";
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        return text.substring(firstBrace, lastBrace + 1);
    }
    return text.replace(/```json\n?|```/g, '').trim();
};

// دالة مركزية لمعالجة الأخطاء
const handleGeminiError = (error: any) => {
    console.error("Gemini API Error details:", error);
    const msg = error.message || error.toString();
    const stringError = JSON.stringify(error);

    // التحقق من خطأ "الخدمة غير مفعلة"
    if (msg.includes("Generative Language API has not been used") || 
        msg.includes("SERVICE_DISABLED") || 
        stringError.includes("SERVICE_DISABLED") ||
        msg.includes("403")) {
        
        throw new Error("API_DISABLED: خدمة الذكاء الاصطناعي غير مفعلة في مشروع Google Cloud. يرجى الضغط على الرابط أدناه لتفعيلها.");
    }
    
    if (msg.includes("API key not valid") || msg.includes("API_KEY_INVALID") || msg.includes("dummy_key")) {
         throw new Error("مفتاح API غير صالح أو مفقود. يرجى التحقق من إعدادات المشروع.");
    }

    throw new Error(msg || "حدث خطأ غير متوقع أثناء الاتصال بالذكاء الاصطناعي");
};

export const parseReportFromText = async (text: string): Promise<Partial<WeeklyReport>> => {
  try {
    const ai = getAIClient();
    
    const systemPrompt = `
    You are an assistant that extracts structured data from Arabic text reports.
    The user will provide text describing factory visits and statistics for the "Future Industrialists" initiative.
    
    Extract the following:
    1. Header info: Week name (e.g. الأسبوع الأول) and Date Range.
    2. Visits: List of visits with School Name, Participant Count, Date, and Factory Name.
    3. Statistics: Total beneficiaries, tweets, posts, videos, and category breakdowns.

    IMPORTANT: Format all dates as YYYY/MM/DD (e.g., 2025/12/15) to ensure correct display.

    Return ONLY a valid JSON object matching this TypeScript interface:
    {
      header: { weekTitle: string, dateRange: string },
      visits: [{ schoolName: string, participants: number, date: string, factory: string }],
      stats: { 
        totalBeneficiaries: number, 
        totalRegistered: number, 
        tweets: number, 
        posts: number, 
        videos: number,
        tvInterviews: number,
        creativeCategory: number,
        discovererCategory: number,
        ambassadorCategory: number,
        artistCategory: number
      }
    }

    If a value is missing, use 0 for numbers or empty string for strings.
    Ensure the output is pure JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: text,
      config: { 
          responseMimeType: "application/json",
          systemInstruction: systemPrompt 
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("لم يتم استلام رد من الذكاء الاصطناعي");

    return JSON.parse(cleanJson(responseText));
  } catch (error: any) {
    handleGeminiError(error);
    return {}; 
  }
};

export const matchImagesToVisits = async (filenames: string[], visits: Visit[]): Promise<Record<string, string>> => {
    try {
        const ai = getAIClient();

        const visitsSummary = visits.map(v => ({
            id: v.id,
            school: v.schoolName,
            factory: v.factory
        }));

        const indexedFiles = filenames.map((name, index) => ({ index, name }));

        const prompt = `
        You are an intelligent file organizer. 
        Match each file (by its INDEX) to the correct Visit ID based on the filename semantics (School Name OR Factory Name).

        Data:
        Visits: ${JSON.stringify(visitsSummary)}
        Files: ${JSON.stringify(indexedFiles)}

        CRITICAL RULES:
        1. Return a JSON object where the KEY is the file "index" (string) and VALUE is the "visit_id".
        2. Example Output: { "0": "visit_123", "1": "visit_456" }
        3. Do NOT use filenames as keys. Use the provided INDEX.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const text = response.text;
        if (!text) return {};
        return JSON.parse(cleanJson(text));
    } catch (error: any) {
        handleGeminiError(error);
        return {};
    }
};

export const matchLogosToFactories = async (filenames: string[], visits: Visit[]): Promise<Record<string, string[]>> => {
    try {
        const ai = getAIClient();

        const factoryList = visits.map(v => ({
            id: v.id,
            factory: v.factory
        }));

        const indexedFiles = filenames.map((name, index) => ({ index, name }));

        const prompt = `
        Match logo files (by INDEX) to **ALL** Visit IDs that correspond to that Factory Name.
        
        Data:
        Factory List (Visits): ${JSON.stringify(factoryList)}
        Files: ${JSON.stringify(indexedFiles)}

        CRITICAL RULES:
        1. Return a JSON object where KEY is the file "index" (string).
        2. VALUE must be an ARRAY of "visit_id"s.
        3. Example Output: { "0": ["id_1", "id_2"], "1": ["id_3"] }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const text = response.text;
        if (!text) return {};
        return JSON.parse(cleanJson(text));
    } catch (error: any) {
        handleGeminiError(error);
        return {};
    }
};