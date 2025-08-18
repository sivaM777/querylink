import { getDatabase } from "../database/database";
import { solutionSyncService } from "./solution-sync-service";

export type IntegrationKey =
  | "JIRA"
  | "CONFLUENCE"
  | "GITHUB"
  | "SN_KB"
  | "SLACK"
  | "MS_TEAMS"
  | "ZENDESK"
  | "LINEAR"
  | "NOTION"
  | "SN_ITSM";

export interface IntegrationInfo {
  key: IntegrationKey;
  name: string;
  features: string[];
  icon?: string;
}

export const INTEGRATIONS: Record<IntegrationKey, IntegrationInfo> = {
  JIRA: { key: "JIRA", name: "Jira", features: ["Issue search", "Project filters", "Link to incident"], icon: "🔧" },
  CONFLUENCE: { key: "CONFLUENCE", name: "Confluence", features: ["KB search", "How‑to docs"], icon: "📋" },
  GITHUB: { key: "GITHUB", name: "GitHub", features: ["Issues/PRs", "Code fixes"], icon: "🐙" },
  SN_KB: { key: "SN_KB", name: "ServiceNow KB", features: ["Knowledge articles", "Troubleshooting guides"], icon: "📚" },
  SLACK: { key: "SLACK", name: "Slack", features: ["Channel message search", "DM indexing", "Thread tracking", "File search"], icon: "💬" },
  MS_TEAMS: { key: "MS_TEAMS", name: "Microsoft Teams", features: ["Channel & chat search", "File tabs"], icon: "🟪" },
  ZENDESK: { key: "ZENDESK", name: "Zendesk", features: ["Ticket search", "Customer history", "KB integration"], icon: "🎧" },
  LINEAR: { key: "LINEAR", name: "Linear", features: ["Issue tracking", "Cycle planning", "Git integration"], icon: "📈" },
  NOTION: { key: "NOTION", name: "Notion", features: ["Page & database search", "Block indexing", "Templates"], icon: "🗂️" },
  SN_ITSM: { key: "SN_ITSM", name: "ServiceNow ITSM", features: ["Incidents", "Changes", "Problems", "Catalog"], icon: "🧰" },
};

export class IntegrationService {
  private db = getDatabase();

  list() {
    const rows = this.db.prepare(`SELECT system as key, enabled, last_sync, last_sync_status FROM system_sync_config`).all() as any[];
    const map: Record<string, any> = {};
    for (const r of rows) map[r.key] = r;
    return Object.values(INTEGRATIONS).map((info) => ({
      ...info,
      enabled: !!(map[info.key]?.enabled),
      last_sync: map[info.key]?.last_sync,
      status: map[info.key]?.last_sync_status || (map[info.key]?.enabled ? 'ready' : 'disconnected'),
    }));
  }

  connect(key: IntegrationKey) {
    this.db.prepare(`INSERT OR IGNORE INTO system_sync_config(system, enabled) VALUES(?, 0)`).run(key);
    this.db.prepare(`UPDATE system_sync_config SET enabled=1, updated_at=CURRENT_TIMESTAMP WHERE system=?`).run(key);
    // kick off a sync in background
    setImmediate(async () => {
      if (key === "SLACK") {
        const { slackSync } = await import("../integrations/slack-sync");
        await slackSync.sync();
      } else {
        await solutionSyncService.syncSystem({ system: key, enabled: true, api_endpoint: '', auth_config: {}, sync_interval: 300 } as any);
      }
    });
    return INTEGRATIONS[key];
  }

  disconnect(key: IntegrationKey) {
    this.db.prepare(`UPDATE system_sync_config SET enabled=0, updated_at=CURRENT_TIMESTAMP WHERE system=?`).run(key);
  }
}

export const integrationService = new IntegrationService();


