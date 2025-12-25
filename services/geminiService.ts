import { GoogleGenAI, Type, Schema } from "@google/genai";
import { WeeklyReport, Visit } from '../types';

const getAIClient = () => {
    // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
    if (!process.env.API_KEY) {
      throw new Error('API_KEY is missing');
    }

    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const parseReportFromText = async (text: string): Promise<Partial<WeeklyReport>> => {
  const ai = getAIClient();
  
  const systemPrompt = `
  You are an assistant that extracts structured data from Arabic text reports for the "Future Industrialists" initiative.
  Extract header info, visits, and statistics.
  If specific numbers are missing, default to 0. If strings are missing, default to empty string.
  `;

  const schema: Schema = {
      type: Type.OBJECT,
      properties: {
          header: {
              type: Type.OBJECT,
              properties: {
                  weekTitle: { type: Type.STRING, nullable: true },
                  dateRange: { type: Type.STRING, nullable: true }
              },
              nullable: true
          },
          visits: {
              type: Type.ARRAY,
              items: {
                  type: Type.OBJECT,
                  properties: {
                      schoolName: { type: Type.STRING, nullable: true },
                      participants: { type: Type.NUMBER, nullable: true },
                      date: { type: Type.STRING, nullable: true },
                      factory: { type: Type.STRING, nullable: true }
                  }
              },
              nullable: true
          },
          stats: {
              type: Type.OBJECT,
              properties: {
                  totalBeneficiaries: { type: Type.NUMBER, nullable: true },
                  totalRegistered: { type: Type.NUMBER, nullable: true },
                  tweets: { type: Type.NUMBER, nullable: true },
                  posts: { type: Type.NUMBER, nullable: true },
                  videos: { type: Type.NUMBER, nullable: true },
                  tvInterviews: { type: Type.NUMBER, nullable: true },
                  creativeCategory: { type: Type.NUMBER, nullable: true },
                  discovererCategory: { type: Type.NUMBER, nullable: true },
                  ambassadorCategory: { type: Type.NUMBER, nullable: true },
                  artistCategory: { type: Type.NUMBER, nullable: true }
              },
              nullable: true
          }
      }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: text,
      config: { 
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: schema
      }
    });

    const json = JSON.parse(response.text || "{}");
    return json;
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

    const indexedFiles = filenames.map((name, index) => ({ index: index.toString(), name }));

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            matches: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        fileIndex: { type: Type.STRING },
                        visitId: { type: Type.STRING }
                    }
                }
            }
        }
    };

    const prompt = `
    Match each file (by its INDEX) to the correct Visit ID based on the filename semantics (School Name OR Factory Name).
    
    Visits: ${JSON.stringify(visitsSummary)}
    Files: ${JSON.stringify(indexedFiles)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        const json = JSON.parse(response.text || "{}");
        const mapping: Record<string, string> = {};
        
        if (json.matches && Array.isArray(json.matches)) {
            json.matches.forEach((m: any) => {
                if (m.fileIndex && m.visitId) {
                    mapping[m.fileIndex] = m.visitId;
                }
            });
        }
        
        console.log("AI Image Match Response:", mapping);
        return mapping;
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

    const indexedFiles = filenames.map((name, index) => ({ index: index.toString(), name }));

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            matches: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        fileIndex: { type: Type.STRING },
                        visitIds: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        }
    };

    const prompt = `
    Match logo files (by INDEX) to **ALL** Visit IDs that correspond to that Factory Name.
    
    Factory List (Visits): ${JSON.stringify(factoryList)}
    Files: ${JSON.stringify(indexedFiles)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                responseSchema: schema 
            }
        });

        const json = JSON.parse(response.text || "{}");
        const mapping: Record<string, string[]> = {};

        if (json.matches && Array.isArray(json.matches)) {
            json.matches.forEach((m: any) => {
                if (m.fileIndex && m.visitIds) {
                    mapping[m.fileIndex] = m.visitIds;
                }
            });
        }

        console.log("AI Logo Match Response:", mapping);
        return mapping;
    } catch (error) {
        console.error("Error matching logos:", error);
        return {}; 
    }
};