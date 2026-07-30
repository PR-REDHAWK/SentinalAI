const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const analyzeIncident = async (alertPayload, source) => {
  const prompt = `
You are an expert DevOps AI and Incident Intelligence engine.
Analyze the following monitoring alert from ${source} and return a structured JSON response.

RAW ALERT DATA:
${JSON.stringify(alertPayload, null, 2)}

Provide a detailed analysis with the following strict JSON structure (do not include markdown wrapping, just the raw JSON object):
{
  "title": "A concise, human-readable title for the incident",
  "aiSummary": "Executive summary of what is happening",
  "severity": "Critical, High, Medium, or Low based on the alert content",
  "category": "e.g. Infrastructure, Database, Authentication, Network",
  "affectedService": "The primary service or component affected",
  "affectedRegion": "Region if identifiable, otherwise 'Global'",
  "confidence": 0-100 score indicating your confidence in this analysis,
  "rootCause": {
    "summary": "Short summary of likely root cause",
    "details": "Detailed explanation",
    "confidence": 0-100,
    "evidence": ["evidence 1", "evidence 2"]
  },
  "businessImpact": {
    "affectedUsers": "Estimation of affected users/traffic",
    "regions": ["Region 1"],
    "estimatedRevenueLoss": "String estimate or 'Unknown'",
    "serviceDegradation": "Description of degraded experience"
  },
  "recommendations": [
    {
      "action": "What to do",
      "description": "How to do it",
      "confidence": 0-100,
      "type": "Mitigation or Resolution",
      "command": "CLI command if applicable, or null"
    }
  ]
}
`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
    });

    const text = response.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini AI Analysis failed:", error);
    throw error;
  }
};

module.exports = {
  analyzeIncident
};
