import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiCall, getAuthHeaders } from "@/utils/api";

interface SlackResult {
  system: string;
  title: string;
  id: string;
  snippet: string;
  link: string;
}

export default function SlackWidget({ query }: { query: string }) {
  const [items, setItems] = useState<SlackResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;
    const run = async () => {
      setLoading(true);
      try {
        const res = await apiCall("/api/querylinker/enhanced-search", {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ query, systems: ["Slack"], maxResults: 5, use_semantic: false }),
        });
        setItems(res.suggestions || []);
      } catch (e) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [query]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">💬 Slack Matches</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Searching Slack…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No Slack matches.</div>
        ) : (
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.id} className="border rounded p-2">
                <div className="text-sm font-medium mb-1">{i.title}</div>
                <div className="text-xs mb-2">{i.snippet}</div>
                <Button size="sm" variant="ghost" onClick={() => window.open(i.link, "_blank", "noopener")}>Open in Slack</Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}


