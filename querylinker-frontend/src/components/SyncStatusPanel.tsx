import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Database,
  Wifi,
  WifiOff 
} from "lucide-react";
import { apiCall, getAuthHeaders } from "@/utils/api";
import { cn } from "@/lib/utils";

interface SyncStatus {
  system: string;
  enabled: boolean;
  last_sync: string;
  last_sync_status: string;
  total_synced: number;
  sync_interval: number;
  last_sync_error?: string;
}

export function SyncStatusPanel() {
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchSyncStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSyncStatus = async () => {
    try {
      const response = await apiCall("/api/querylinker/sync-status", {
        headers: getAuthHeaders(),
      });
      setSyncStatuses(response.systems || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch sync status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSync = async (system?: string) => {
    try {
      await apiCall("/api/querylinker/trigger-sync", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ system }),
      });
      
      // Refresh status after triggering sync
      setTimeout(fetchSyncStatus, 2000);
    } catch (error) {
      console.error("Failed to trigger sync:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    }
  };

  const systemConfig = {
    JIRA: { name: "Jira", icon: "🔧", color: "bg-blue-500" },
    GITHUB: { name: "GitHub", icon: "🐙", color: "bg-gray-800" },
    CONFLUENCE: { name: "Confluence", icon: "📋", color: "bg-blue-600" },
    SN_KB: { name: "ServiceNow KB", icon: "📚", color: "bg-green-600" },
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            Real-time Data Collection
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerSync()}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />
              Sync All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded"></div>
                    <div className="space-y-1">
                      <div className="h-4 bg-muted rounded w-20"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-muted rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          syncStatuses.map((status) => {
            const config = systemConfig[status.system as keyof typeof systemConfig] || {
              name: status.system,
              icon: "⚡",
              color: "bg-gray-500"
            };

            return (
              <div
                key={status.system}
                className="flex items-center justify-between p-3 border rounded hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded flex items-center justify-center text-white text-sm", config.color)}>
                    {config.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{config.name}</span>
                      {status.enabled ? (
                        <Wifi className="h-3 w-3 text-green-500" />
                      ) : (
                        <WifiOff className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{status.total_synced} solutions</span>
                      <span>•</span>
                      <span>Last: {formatTimeAgo(status.last_sync)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn("text-xs", getStatusColor(status.last_sync_status))}
                  >
                    {getStatusIcon(status.last_sync_status)}
                    <span className="ml-1 capitalize">{status.last_sync_status || 'pending'}</span>
                  </Badge>
                  
                  {status.enabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => triggerSync(status.system)}
                      className="h-7 px-2"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
        
        {!isLoading && syncStatuses.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No sync configurations found</p>
          </div>
        )}

        {/* Summary Stats */}
        {!isLoading && syncStatuses.length > 0 && (
          <div className="pt-3 border-t">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold">
                  {syncStatuses.reduce((acc, s) => acc + s.total_synced, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Total Solutions</div>
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {syncStatuses.filter(s => s.enabled).length}/{syncStatuses.length}
                </div>
                <div className="text-xs text-muted-foreground">Active Systems</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
