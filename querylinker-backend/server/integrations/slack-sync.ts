import { getDatabase } from "../database/database";

interface SlackMessage {
  channel: string;
  user: string;
  text: string;
  ts: string;
  url: string;
}

export class SlackSync {
  async sync(): Promise<number> {
    const samples: SlackMessage[] = [
      {
        channel: "#auth-incidents",
        user: "alice",
        text: "401 after cert rotation on auth-gateway. Fix was to update truststore and restart.",
        ts: new Date(Date.now() - 3600_000).toISOString(),
        url: "https://slack.example.com/archives/C123/p1699999999",
      },
      {
        channel: "#db-ops",
        user: "bob",
        text: "DB timeouts during peak: add missing index on sessions(user_id, created_at).",
        ts: new Date(Date.now() - 7200_000).toISOString(),
        url: "https://slack.example.com/archives/C124/p1699999998",
      },
      {
        channel: "#kafka",
        user: "carol",
        text: "Consumer lag spike fixed by increasing max.poll.interval.ms and rolling restart.",
        ts: new Date(Date.now() - 5400_000).toISOString(),
        url: "https://slack.example.com/archives/C125/p1699999997",
      },
      {
        channel: "#frontend",
        user: "dave",
        text: "CSP blocked script after hardening. Add 'script-src' for cdn.example.com.",
        ts: new Date(Date.now() - 1800_000).toISOString(),
        url: "https://slack.example.com/archives/C126/p1699999996",
      },
    ];

    let count = 0;
    for (const m of samples) {
      const title = `${m.channel}: ${m.text.slice(0, 60)}...`;
      const body = `[${m.user}] ${m.text}`;
      const recordId = await expressSqliteRag.upsertRecord("Slack", `${m.channel}-${m.ts}`, title, body, m.url, [m.channel.replace('#',''), "slack", "chat"]);
      await expressSqliteRag.indexRecord(recordId, body);
      count += 1;
    }
    return count;
  }
}

export const slackSync = new SlackSync();


