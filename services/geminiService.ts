import { GoogleGenAI } from "@google/genai";
import { WeeklyReport, Visit } from '../types';

const getAIClient = () => {
    // @ts-ignore
    const apiKey = import.meta.env.VITE_API_KEY ?? import.meta.env['VITE_API_KEY'];

    if (!apiKey) {
      throw new Error('VITE_API_KEY is missing');
    }

    return new GoogleGenAI({ apiKey });
};

// تحسين دالة التنظيف لاستخراج الكائن JSON فقط بغض النظر عن النصوص المحيطة
const cleanJson = (text: string): string => {
    if (!text) return "";
    // محاولة العثور على أول قوس { وآخر قوس }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
        return text.substring(firstBrace, lastBrace + 1);
    }
    
    // Fallback: إزالة الرموز الخاصة فقط
    return text.replace(/```json\n?|```/g, '').trim();
};

export const parseReportFromText = async (text: string): Promise<Partial<WeeklyReport>> => {
  const ai = getAIClient();
  
  const systemPrompt = `
  You are an assistant that extracts structured data from Arabic text reports.
  The user will provide text describing factory visits and statistics for the "Future Industrialists" initiative.
  
  Extract the following:
  1. Header info: Week name (e.g. الأسبوع الأول) and Date Range.
  2. Visits: List of visits with School Name, Participant Count, Date, and Factory Name.
  3. Statistics: Total beneficiaries, tweets, posts, videos, and category breakdowns (Creative, Discoverer, Ambassador, Artist).

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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'user', parts: [{ text: text }] }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("لم يتم استلام رد من الذكاء الاصطناعي");

    return JSON.parse(cleanJson(responseText));
  } catch (error: any) {
    console.error("Error parsing text with Gemini:", error);
    throw error;
  }
};

export const matchImagesToVisits = async (filenames: string[], visits: Visit[]): Promise<Record<string, string>> => {
    const ai = getAIClient();

    const visitsSummary = visits.map(v => ({
        id: v.id,
        school: v.schoolName,
        factory: v.factory
    }));

    // تحسين الأمر البرمجي لضمان عدم تغيير أسماء الملفات
    const prompt = `
    You are an intelligent file organizer. 
    I have a list of image filenames and a list of School Visits.
    
    Task: Match each filename to the most likely Visit ID based on the text in the filename (School Name OR Factory Name).

    CRITICAL RULES:
    1. The Output JSON Keys MUST be the **EXACT** filenames from the provided list (do not remove extensions like .jpg or .png).
    2. If a file matches "Jeddah School", find the visit ID for that school.
    3. If a file matches "York Factory", find the visit ID for that factory.
    4. Return ONLY a JSON object.

    Input Data:
    Visits: ${JSON.stringify(visitsSummary)}
    Filenames: ${JSON.stringify(filenames)}
    
    Expected Output Format:
    { "exact_filename_1.jpg": "visit_id_1", "exact_filename_2.png": "visit_id_2" }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });

        const text = response.text;
        if (!text) return {};
        // طباعة الرد للتأكد أثناء التطوير
        console.log("AI Image Match Response:", text);
        return JSON.parse(cleanJson(text));
    } catch (error) {
        console.error("Error matching images:", error);
        return {}; 
    }
};

export const matchLogosToFactories = async (filenames: string[], visits: Visit[]): Promise<Record<string, string[]>> => {
    const ai = getAIClient();

    const factoryList = visits.map(v => ({
        id: v.id,
        factory: v.factory
    }));

    // تحسين الأمر البرمجي لضمان الدقة في أسماء الملفات
    const prompt = `
    You are an intelligent bilingual assistant organizing factory logos.
    Task: Match logo filenames to **ALL** Visit IDs that correspond to that Factory Name.
    
    CRITICAL RULES:
    1. The Output JSON Keys MUST be the **EXACT** filenames from the provided list.
    2. Map Arabic factory names to English filenames if needed (e.g., "Almarai.png" -> "المراعي").
    3. Return an ARRAY of visit IDs for each matched logo.

    Data:
    Factory List (Visits): ${JSON.stringify(factoryList)}
    Logo Filenames: ${JSON.stringify(filenames)}
    
    Expected Output Format:
    { "exact_logo_name.png": ["id_1", "id_2"] }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });

        const text = response.text;
        if (!text) return {};
        console.log("AI Logo Match Response:", text);
        return JSON.parse(cleanJson(text));
    } catch (error) {
        console.error("Error matching logos:", error);
        return {}; 
    }
};