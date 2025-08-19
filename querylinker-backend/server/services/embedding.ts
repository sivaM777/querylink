import axios from "axios";

export type EmbeddingModel = "openai:text-embedding-3-large" | "openai:text-embedding-3-small" | "local:sentence-bert";

export class EmbeddingService {
  private provider: EmbeddingModel;
  private openaiKey?: string;

  constructor(model?: EmbeddingModel) {
    this.provider = model || (process.env.EMBEDDING_MODEL as EmbeddingModel) || "openai:text-embedding-3-small";
    this.openaiKey = process.env.OPENAI_API_KEY;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];
    if (this.provider.startsWith("openai:")) {
      return this.embedOpenAI(texts);
    }
    // Fallback naive hashing embedding for environments without keys (dev only)
    return texts.map((t) => this.hashToVector(t, 256));
  }

  private async embedOpenAI(texts: string[]): Promise<number[][]> {
    if (!this.openaiKey) {
      // Dev fallback
      return texts.map((t) => this.hashToVector(t, 1536));
    }
    const model = this.provider.replace("openai:", "");
    const resp = await axios.post(
      "https://api.openai.com/v1/embeddings",
      { model, input: texts },
      { headers: { Authorization: `Bearer ${this.openaiKey}` } },
    );
    return (resp.data.data || []).map((d: any) => d.embedding as number[]);
  }

  private hashToVector(text: string, dims: number): number[] {
    // simple, stable pseudo-embedding so dev can run without external deps
    const vec = new Array<number>(dims).fill(0);
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      const idx = (i * 31 + code) % dims;
      vec[idx] += ((code % 13) - 6) / 6;
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  }
}

export const embeddingService = new EmbeddingService();


