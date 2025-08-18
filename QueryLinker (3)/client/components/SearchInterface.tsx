import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Settings, RefreshCw, Wrench, BookOpen, Github, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInterfaceProps {
  onSearch: (data: SearchData) => void;
  isLoading: boolean;
  connectedSystems: string[];
}

interface SearchData {
  incidentNumber: string;
  shortDescription: string;
  description: string;
  maxResults: number;
}

const systemIcons = {
  JIRA: { icon: <Wrench className="h-3 w-3" />, color: "bg-ql-jira" },
  CONFLUENCE: { icon: <BookOpen className="h-3 w-3" />, color: "bg-ql-confluence" },
  GITHUB: { icon: <Github className="h-3 w-3" />, color: "bg-ql-github" },
  SN_KB: { icon: <Building2 className="h-3 w-3" />, color: "bg-ql-servicenow" },
};

export default function SearchInterface({
  onSearch,
  isLoading,
  connectedSystems,
}: SearchInterfaceProps) {
  const [formData, setFormData] = useState<SearchData>({
    incidentNumber:
      "INC" + String(Math.floor(Math.random() * 1000000)).padStart(7, "0"),
    shortDescription: "",
    description: "",
    maxResults: 5,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(formData);
  };

  const loadExample = () => {
    setFormData({
      ...formData,
      shortDescription: "Login failure on portal after patch",
      description:
        "After applying patch 4.3.2, users are experiencing 401 authentication errors when trying to access the customer portal. The issue started this morning around 9 AM and affects approximately 50% of users. Error logs show 'Invalid credentials' but users report using correct login information.",
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              QueryLinker Search
            </CardTitle>
            <CardDescription>
              AI-powered search across your connected systems
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadExample}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Load Example
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="incident">Incident Number</Label>
              <Input
                id="incident"
                value={formData.incidentNumber}
                onChange={(e) =>
                  setFormData({ ...formData, incidentNumber: e.target.value })
                }
                placeholder="INC0010001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxResults">Max Results</Label>
              <Input
                id="maxResults"
                type="number"
                min="1"
                max="50"
                value={formData.maxResults}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxResults: parseInt(e.target.value) || 5,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortDescription">Short Description</Label>
            <Input
              id="shortDescription"
              value={formData.shortDescription}
              onChange={(e) =>
                setFormData({ ...formData, shortDescription: e.target.value })
              }
              placeholder="Brief summary of the issue"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Provide detailed information about the issue, including steps to reproduce, error messages, and any relevant context..."
              className="min-h-[120px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Connected Systems</Label>
            <div className="flex flex-wrap gap-2">
              {connectedSystems.map((system) => {
                const config = systemIcons[system as keyof typeof systemIcons];
                return (
                  <Badge
                    key={system}
                    className={cn("px-2 py-1", config?.color || "bg-secondary")}
                  >
                    <span className="mr-1">{config?.icon || "🔗"}</span>
                    {system.replace("_", " ")}
                  </Badge>
                );
              })}
              {connectedSystems.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  No systems connected
                </span>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={
              isLoading || !formData.shortDescription || !formData.description
            }
            className="w-full"
          >
            {isLoading ? (
              <>
                <Search className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Find Related Solutions
              </>
            )}
          </Button>
        </form>

        {/* Example Incidents Section */}
        <div className="mt-6 pt-4 border-t">
          <Label className="text-sm font-medium">Quick Examples</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Load common incident scenarios to test
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              {
                title: "Authentication Issues",
                short: "Users unable to login after patch update",
                description:
                  "Multiple users reporting 401 authentication errors after security patch 4.3.2 deployment. Login attempts fail with 'Invalid credentials' despite correct passwords. Issue affects portal access across all departments.",
                incident: "INC0010001",
              },
              {
                title: "Database Performance",
                short: "Application slow response times",
                description:
                  "Production application experiencing severe performance degradation. Database queries taking 30+ seconds to complete. Connection pool exhaustion errors in logs. High CPU usage on database server.",
                incident: "INC0010002",
              },
              {
                title: "SSL Certificate Issues",
                short: "SSL handshake failures in production",
                description:
                  "API communication failing with SSL handshake errors. Certificate validation issues causing service disruptions. External integrations cannot establish secure connections.",
                incident: "INC0010003",
              },
              {
                title: "Memory Leak Investigation",
                short: "Application OutOfMemoryError crashes",
                description:
                  "Production server experiencing memory leaks leading to OutOfMemoryError crashes. Application becomes unresponsive after 2-3 hours of operation. Heap dump analysis required.",
                incident: "INC0010004",
              },
              {
                title: "Network Connectivity",
                short: "Intermittent network timeouts",
                description:
                  "Random network connectivity issues affecting service availability. Timeout errors during peak hours. Load balancer health checks failing intermittently.",
                incident: "INC0010005",
              },
              {
                title: "API Rate Limiting",
                short: "Third-party API calls failing",
                description:
                  "External API integrations hitting rate limits causing service failures. Need to implement proper retry logic and backoff strategies for improved reliability.",
                incident: "INC0010006",
              },
            ].map((example, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="text-left h-auto p-2 justify-start"
                onClick={() => {
                  setFormData({
                    incidentNumber: example.incident,
                    shortDescription: example.short,
                    description: example.description,
                    maxResults: 10,
                  });
                }}
              >
                <div className="text-xs">
                  <div className="font-medium">{example.title}</div>
                  <div className="text-muted-foreground truncate">
                    {example.short}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
