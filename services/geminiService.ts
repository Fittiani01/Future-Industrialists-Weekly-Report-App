import { GoogleGenAI } from "@google/genai";
import { WeeklyReport, Visit } from '../types';

if (!process.env.API_KEY) {
    console.warn("API Key is missing in environment variables");
}

const getAIClient = () => {
    let apiKey = '';
    try {
        apiKey = process.env.API_KEY || '';
    } catch(e) {
        // ignore
    }
    
    if (!apiKey) {
        throw new Error("مفتاح API غير موجود. يرجى التأكد من إضافة API_KEY في إعدادات البيئة (Environment Variables) في Vercel.");
    }
    return new GoogleGenAI({ apiKey });
};

// Helper to remove Markdown code blocks (e.g. ```json ... ```)
const cleanJson = (text: string): string => {
    if (!text) return "";
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
  } catch (error) {
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

    const prompt = `
    You are an intelligent file organizer. 
    I have a list of image filenames and a list of School Visits (which include a School Name and a Factory Name).
    
    Your task is to match each filename to the most likely Visit ID based on semantic similarity.
    
    Rules:
    1. Match if the filename contains parts of the School Name OR the Factory Name.
    2. Handle language differences (e.g., filename "York_1.jpg" matches factory "يورك").
    3. Handle typos or short codes (e.g., "Jeddah_S" matches "Jeddah School").
    4. If a file does not clearly belong to any visit, do not include it in the result.

    Input Data:
    Visits: ${JSON.stringify(visitsSummary)}
    Filenames: ${JSON.stringify(filenames)}

    Return ONLY a JSON object where keys are filenames and values are the Visit IDs.
    Example: { "york_img1.jpg": "1", "school_visit.png": "2" }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        if (!text) return {};
        return JSON.parse(cleanJson(text));
    } catch (error) {
        console.error("Error matching images:", error);
        return {}; // Fallback to empty matching if AI fails
    }
};

export const matchLogosToFactories = async (filenames: string[], visits: Visit[]): Promise<Record<string, string[]>> => {
    const ai = getAIClient();

    // Extract unique factories and their visit IDs
    const factoryList = visits.map(v => ({
        id: v.id,
        factory: v.factory
    }));

    const prompt = `
    You are an intelligent bilingual assistant organizing factory logos.
    
    Task: Match logo filenames to **ALL** Visit IDs that correspond to that Factory Name.
    
    CRITICAL MATCHING RULES:
    1. **One-to-Many:** If "Factory A" appears in multiple visits (even on different dates), assign the logo to **ALL** of their IDs.
    2. **Language Agnostic:** Match Arabic factory names to English filenames and vice versa.
    3. **Ignore Noise:** Ignore symbols, numbers, dates, or words like "logo", "final" in the filename.
    
    Data:
    Factory List (Visits): ${JSON.stringify(factoryList)}
    Logo Filenames: ${JSON.stringify(filenames)}
    
    Return ONLY a JSON object mapping the filename to an ARRAY of Visit IDs.
    Example: { "York.png": ["101", "102"], "Almarai.svg": ["205"] }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        if (!text) return {};
        return JSON.parse(cleanJson(text));
    } catch (error) {
        console.error("Error matching logos:", error);
        return {}; 
    }
};