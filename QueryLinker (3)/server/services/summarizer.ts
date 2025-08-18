import axios from "axios";

export class SummarizerService {
  private openaiKey?: string;
  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY;
  }

  async summarize(incident: string, doc: string): Promise<string> {
    if (!this.openaiKey) {
      // Fallback extractive summary for dev
      const first = doc.split(/\n|\.\s/).slice(0, 3).join(". ");
      return `${first}...`;
    }
    const prompt = `You are a support assistant. Given an incident and a candidate document, 
produce a short, actionable summary (2-4 bullet points) of why the document is relevant and the concrete steps to try.
Incident:\n${incident}\n\nDocument:\n${doc}\n`;
    const resp = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: process.env.SUMMARIZATION_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: "Summarize relevant fixes as concise steps." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      },
      { headers: { Authorization: `Bearer ${this.openaiKey}` } },
    );
    return resp.data.choices?.[0]?.message?.content?.trim() || "";
  }
}

export const summarizer = new SummarizerService();


