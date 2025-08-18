import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Link as LinkIcon, Eye, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Suggestion {
  system: "JIRA" | "CONFLUENCE" | "GITHUB" | "SN_KB";
  title: string;
  id: string;
  snippet: string;
  link: string;
  icon: string;
  actions: string[];
}

interface SuggestionPanelProps {
  suggestions: Suggestion[];
  isLoading: boolean;
  onLinkToIncident: (suggestion: Suggestion) => void;
  isRealData?: boolean;
}

const systemConfig = {
  JIRA: {
    color: "bg-ql-jira text-black dark:!text-white",
    name: "Jira",
    icon: "🔧",
  },
  CONFLUENCE: {
    color: "bg-ql-confluence text-black dark:!text-white",
    name: "Confluence",
    icon: "📋",
  },
  GITHUB: {
    color: "bg-ql-github text-black dark:!text-white",
    name: "GitHub",
    icon: "🐙",
  },
  SN_KB: {
    color: "bg-ql-servicenow text-black dark:!text-white",
    name: "ServiceNow KB",
    icon: "📚",
  },
};

export default function SuggestionPanel({
  suggestions,
  isLoading,
  onLinkToIncident,
  isRealData = false,
}: SuggestionPanelProps) {
  const navigate = useNavigate();
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<Suggestion | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleViewDetails = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Searching for Related Solutions...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-muted rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>No Related Solutions Found</CardTitle>
          <CardDescription>
            Try adding more details to your incident description or check your
            system connections.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Related Solutions Found</CardTitle>
            {isRealData && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                Real-time Data
              </Badge>
            )}
          </div>
          <CardDescription>
            Found {suggestions.length} potentially related solutions across
            connected systems {isRealData ? '(from live database)' : '(simulated data)'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestions.map((suggestion) => {
            const config = systemConfig[suggestion.system];
            return (
              <div
                key={suggestion.id}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Badge className={cn("px-2 py-1 text-xs", config.color)}>
                    <span className="mr-1 text-black dark:text-white">{config.icon}</span>
                    <span className="text-black dark:text-white">{config.name}</span>
                  </Badge>
                  <div className="flex-1 min-w-0 text-black dark:text-white">
                    <h4 className="font-medium text-sm leading-snug mb-1 truncate">
                      {suggestion.title}
                    </h4>
                    <p className="text-xs mb-3">
                      {suggestion.snippet}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(suggestion)}
                        className="h-7 px-2 text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onLinkToIncident(suggestion)}
                        className="h-7 px-2 text-xs"
                      >
                        <LinkIcon className="h-3 w-3 mr-1" />
                        Link to Incident
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          // Always open details page; there we can expose external URL
                          navigate(`/solution/${suggestion.id}`);
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          {selectedSuggestion && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    className={cn(
                      "px-2 py-1 text-xs",
                      systemConfig[selectedSuggestion.system].color,
                    )}
                  >
                    <span className="mr-1">
                      {systemConfig[selectedSuggestion.system].icon}
                    </span>
                    {systemConfig[selectedSuggestion.system].name}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {selectedSuggestion.id}
                  </span>
                </div>
                <DialogTitle className="text-left">
                  {selectedSuggestion.title}
                </DialogTitle>
                <DialogDescription className="text-left">
                  {selectedSuggestion.snippet}
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 pt-4">
                <Button onClick={() => onLinkToIncident(selectedSuggestion)}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link to Incident
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    navigate(`/solution/${selectedSuggestion.id}`);
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Solution Details
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
