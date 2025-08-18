import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Users,
  Target,
  Clock,
  RefreshCw,
  Database,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  ArrowLeft,
  Home,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AnalyticsResponse } from "@shared/querylinker-api";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/querylinker/analytics?days=${period}`);
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const cleanupCache = async () => {
    try {
      const response = await fetch("/api/querylinker/cache/cleanup", {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Cache cleanup:", result);
        fetchAnalytics(); // Refresh data
      }
    } catch (err) {
      console.error("Cache cleanup error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span>Loading analytics...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load analytics: {error}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>No analytics data available</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">QueryLinker Analytics</h1>
                <p className="text-muted-foreground">
                  Performance insights and usage analytics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Period:</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(Number(e.target.value))}
                  className="px-3 py-1 rounded border bg-background"
                >
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
              <Button onClick={fetchAnalytics} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Interactions
                  </p>
                  <p className="text-2xl font-bold">
                    {analytics.summary.total_interactions}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">
                    {analytics.summary.active_users}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Unique Incidents
                  </p>
                  <p className="text-2xl font-bold">
                    {analytics.summary.unique_incidents}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Avg Effectiveness
                  </p>
                  <p className="text-2xl font-bold">
                    {analytics.summary.avg_effectiveness.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="systems" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="systems">System Performance</TabsTrigger>
            <TabsTrigger value="trends">Usage Trends</TabsTrigger>
            <TabsTrigger value="suggestions">Top Suggestions</TabsTrigger>
            <TabsTrigger value="cache">Cache Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="systems" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Popularity</CardTitle>
                  <CardDescription>Link interactions by system</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.system_popularity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="system" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="link_count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Effectiveness</CardTitle>
                  <CardDescription>
                    Effectiveness scores by system
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analytics.system_popularity.map((system, index) => (
                    <div key={system.system} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{system.system}</span>
                        <Badge
                          variant={
                            system.effectiveness_score > 50
                              ? "default"
                              : "secondary"
                          }
                        >
                          {system.effectiveness_score.toFixed(1)}%
                        </Badge>
                      </div>
                      <Progress
                        value={system.effectiveness_score}
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        {system.recommendation}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Interaction Trends</CardTitle>
                <CardDescription>
                  Daily interaction volume over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analytics.interaction_trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total_interactions"
                      stroke="#8884d8"
                    />
                    <Line
                      type="monotone"
                      dataKey="unique_incidents"
                      stroke="#82ca9d"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Most Effective Suggestions</CardTitle>
                <CardDescription>
                  Suggestions with highest link rates and impact
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.effective_suggestions.map((suggestion, index) => (
                    <div
                      key={suggestion.suggestion_id}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge>{suggestion.system}</Badge>
                            <Badge variant="outline">
                              {suggestion.impact_level}
                            </Badge>
                          </div>
                          <h4 className="font-medium mb-1">
                            {suggestion.suggestion_title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {suggestion.link_count} links •{" "}
                            {suggestion.incident_count} incidents •{" "}
                            {suggestion.user_count} users
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">
                            {suggestion.effectiveness_rating.toFixed(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            effectiveness
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cache" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cache Performance</CardTitle>
                  <CardDescription>Database caching statistics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Total Cached
                      </p>
                      <p className="text-2xl font-bold">
                        {analytics.cache_performance.total_cached || 0}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Valid Entries
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {analytics.cache_performance.valid_cached || 0}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Expired</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {analytics.cache_performance.expired_cached || 0}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Avg Search Time
                      </p>
                      <p className="text-2xl font-bold">
                        {analytics.cache_performance.avg_search_time_ms || 0}ms
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={cleanupCache}
                    variant="outline"
                    className="w-full"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Cleanup Expired Cache
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                  <CardDescription>
                    System optimization suggestions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.recommendations.length > 0 ? (
                      analytics.recommendations.map((rec, index) => (
                        <Alert key={index}>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>{rec}</AlertDescription>
                        </Alert>
                      ))
                    ) : (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          System is performing well - no recommendations at this
                          time.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
