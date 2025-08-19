import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  ArrowLeft,
  Settings,
  Bell,
  Calendar,
  Target,
  FileText,
  Download,
  Mail,
  Edit,
  Plus,
} from "lucide-react";
import Modal from "@/components/Modal";

const COLORS = ["#10B981", "#F59E0B", "#EF4444", "#6366F1"];

export default function SLAManagement() {
  const [slaData, setSlaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSLA, setEditingSLA] = useState<any>(null);
  const [newSLA, setNewSLA] = useState({
    name: "",
    priorityLevel: "",
    targetHours: "",
    description: "",
    escalationRules: "",
  });

  useEffect(() => {
    fetchSLAData();
  }, []);

  const fetchSLAData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/querylinker/sla-data");
      if (response.ok) {
        const data = await response.json();
        setSlaData(data);
      } else {
        console.error("Failed to fetch SLA data, status:", response.status);
        setSlaData({
          overview: {
            totalSLAs: 0,
            activeSLAs: 0,
            breachedSLAs: 0,
            atRiskSLAs: 0,
            averageResolutionTime: "N/A",
            slaCompliance: 0,
          },
          slaTargets: [],
          trends: [],
          escalations: [],
        });
      }
    } catch (error) {
      console.error("Failed to fetch SLA data:", error);
      setSlaData({
        overview: {
          totalSLAs: 0,
          activeSLAs: 0,
          breachedSLAs: 0,
          atRiskSLAs: 0,
          averageResolutionTime: "N/A",
          slaCompliance: 0,
        },
        slaTargets: [],
        trends: [],
        escalations: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSLA = async () => {
    if (!newSLA.name || !newSLA.priorityLevel || !newSLA.targetHours) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const response = await fetch("/api/querylinker/sla-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": "current-user",
        },
        body: JSON.stringify({
          name: newSLA.name,
          priorityLevel: newSLA.priorityLevel,
          targetHours: Number(newSLA.targetHours),
          description: newSLA.description,
          escalationRules: newSLA.escalationRules
            ? JSON.parse(newSLA.escalationRules)
            : {},
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert(`SLA "${newSLA.name}" created successfully!`);
          setNewSLA({
            name: "",
            priorityLevel: "",
            targetHours: "",
            description: "",
            escalationRules: "",
          });
          setShowConfigModal(false);
          fetchSLAData();
        } else {
          alert("Failed to create SLA: " + (data.error || "Unknown error"));
        }
      } else {
        const errorData = await response.json();
        alert("Failed to create SLA: " + (errorData.error || "Server error"));
      }
    } catch (error) {
      console.error("Error creating SLA:", error);
      alert("Failed to create SLA: Network error");
    }
  };

  const handleEscalateIncident = async (incidentId: string) => {
    const reason = prompt(`Reason for escalating ${incidentId}:`);
    if (!reason) return;

    try {
      const response = await fetch("/api/querylinker/sla-escalate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": "current-user",
        },
        body: JSON.stringify({
          incidentId,
          escalationLevel: 2,
          reason,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert(data.message);
          fetchSLAData();
        } else {
          alert("Failed to escalate: " + (data.error || "Unknown error"));
        }
      } else {
        const errorData = await response.json();
        alert("Failed to escalate: " + (errorData.error || "Server error"));
      }
    } catch (error) {
      console.error("Error escalating incident:", error);
      alert("Failed to escalate: Network error");
    }
  };

  const handleGenerateReport = async (
    reportType: string,
    format: string = "json",
  ) => {
    try {
      const response = await fetch(
        `/api/querylinker/sla-report?reportType=${reportType}&format=${format}`,
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Instead of just showing alert, actually display the data
          const reportWindow = window.open("", "_blank");
          if (reportWindow) {
            reportWindow.document.write(`
              <html>
                <head>
                  <title>SLA Report - ${reportType}</title>
                  <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .metric { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f5f5f5; }
                  </style>
                </head>
                <body>
                  <div class="header">
                    <h1>SLA Report: ${reportType}</h1>
                    <p>Generated on: ${new Date().toLocaleDateString()}</p>
                    <p>Total Records: ${data.data.length}</p>
                  </div>
                  <div class="content">
                    <h2>Report Summary</h2>
                    ${data.data
                      .map(
                        (item: any, index: number) => `
                      <div class="metric">
                        <strong>Record ${index + 1}:</strong>
                        <pre>${JSON.stringify(item, null, 2)}</pre>
                      </div>
                    `,
                      )
                      .join("")}
                  </div>
                </body>
              </html>
            `);
            reportWindow.document.close();
          }
        }
      }
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report");
    }
  };

  const handleExportPDF = async (reportType: string) => {
    try {
      // Dynamically import jsPDF
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      // Create new PDF document
      const doc = new jsPDF('p', 'mm', 'a4');

      // Add title
      doc.setFontSize(20);
      doc.setTextColor(40);
      doc.text('SLA Management Report', 20, 20);

      // Add subtitle
      doc.setFontSize(12);
      doc.setTextColor(60);
      doc.text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 20, 30);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);

      let yPosition = 50;

      // Add overview section
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text('SLA Overview', 20, yPosition);
      yPosition += 10;

      // Overview data
      const overviewData = [
        ['Total SLAs', slaData.overview.totalSLAs.toString()],
        ['SLA Compliance', `${slaData.overview.slaCompliance}%`],
        ['Breached SLAs', slaData.overview.breachedSLAs.toString()],
        ['At Risk SLAs', slaData.overview.atRiskSLAs.toString()],
        ['Average Resolution Time', slaData.overview.averageResolutionTime],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: overviewData,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] },
        styles: { fontSize: 10 },
        margin: { left: 20, right: 20 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;

      // Add SLA Targets section
      if (slaData.slaTargets && slaData.slaTargets.length > 0) {
        doc.setFontSize(14);
        doc.text('SLA Targets Performance', 20, yPosition);
        yPosition += 10;

        const slaTargetsData = slaData.slaTargets.map((sla: any) => [
          sla.name,
          sla.target,
          sla.current,
          `${sla.compliance}%`,
          sla.incidents.toString(),
          sla.status === 'on_track' ? 'On Track' : 'Breached'
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['SLA Name', 'Target', 'Current Avg', 'Compliance', 'Incidents', 'Status']],
          body: slaTargetsData,
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129] },
          styles: { fontSize: 9 },
          margin: { left: 20, right: 20 },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 25 },
            2: { cellWidth: 25 },
            3: { cellWidth: 25 },
            4: { cellWidth: 20 },
            5: { cellWidth: 20 }
          }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 20;
      }

      // Add escalations section if there are any
      if (slaData.escalations && slaData.escalations.length > 0) {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text('Active Escalations', 20, yPosition);
        yPosition += 10;

        const escalationsData = slaData.escalations.map((escalation: any) => [
          escalation.incident,
          escalation.title,
          escalation.priority,
          escalation.assignedTo,
          escalation.timeToEscalation,
          escalation.level
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Incident', 'Title', 'Priority', 'Assigned To', 'Time to Escalation', 'Level']],
          body: escalationsData,
          theme: 'grid',
          headStyles: { fillColor: [239, 68, 68] },
          styles: { fontSize: 8 },
          margin: { left: 20, right: 20 }
        });
      }

      // Add footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Page ${i} of ${pageCount}`, 170, 290);
        doc.text('Generated by QueryLinker SLA Management', 20, 290);
      }

      // Save the PDF
      doc.save(`sla-report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`);

      alert('PDF report generated and downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    }
  };

  const handleExportExcel = async (reportType: string) => {
    try {
      const response = await fetch(
        `/api/querylinker/sla-report?reportType=${reportType}&format=csv`,
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sla-report-${reportType}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert("Excel file downloaded successfully!");
      }
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Failed to export to Excel");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading SLA Management...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">SLA Management</h1>
              <p className="text-muted-foreground">
                Monitor and manage service level agreements
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowConfigModal(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Configure SLAs
            </Button>
            <Button variant="outline" onClick={() => setShowAlertsModal(true)}>
              <Bell className="h-4 w-4 mr-2" />
              Alerts
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total SLAs
                  </p>
                  <p className="text-2xl font-bold">
                    {slaData.overview.totalSLAs}
                  </p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    SLA Compliance
                  </p>
                  <p className="text-2xl font-bold">
                    {slaData.overview.slaCompliance}%
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Breached SLAs
                  </p>
                  <p className="text-2xl font-bold text-red-500">
                    {slaData.overview.breachedSLAs}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Avg Resolution
                  </p>
                  <p className="text-2xl font-bold">
                    {slaData.overview.averageResolutionTime}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="targets" className="space-y-6">
          <TabsList>
            <TabsTrigger value="targets">SLA Targets</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="escalations">Escalations</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="targets">
            <Card>
              <CardHeader>
                <CardTitle>SLA Performance by Priority</CardTitle>
                <CardDescription>
                  Current performance against defined SLA targets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {slaData.slaTargets.map((sla: any, index: number) => (
                    <div key={sla.id || `sla-${index}`} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{sla.name}</h3>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              sla.status === "on_track"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {sla.status === "on_track"
                              ? "On Track"
                              : "Breached"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingSLA(sla)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Target
                          </p>
                          <p className="font-medium">{sla.target}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Current Avg
                          </p>
                          <p className="font-medium">{sla.current}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Compliance
                          </p>
                          <p className="font-medium">{sla.compliance}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Incidents
                          </p>
                          <p className="font-medium">{sla.incidents}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Compliance Rate</span>
                          <span>{sla.compliance}%</span>
                        </div>
                        <Progress value={sla.compliance} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>SLA Compliance Trends</CardTitle>
                <CardDescription>
                  7-day overview of SLA performance and incident resolution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={slaData.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="compliance"
                      stroke="#10B981"
                      name="Compliance %"
                    />
                    <Line
                      type="monotone"
                      dataKey="resolved"
                      stroke="#3B82F6"
                      name="Resolved"
                    />
                    <Line
                      type="monotone"
                      dataKey="breached"
                      stroke="#EF4444"
                      name="Breached"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="escalations">
            <Card>
              <CardHeader>
                <CardTitle>Active Escalations</CardTitle>
                <CardDescription>
                  Incidents requiring escalation management
                </CardDescription>
              </CardHeader>
              <CardContent>
                {slaData.escalations.length > 0 ? (
                  <div className="space-y-4">
                    {slaData.escalations.map((escalation: any) => (
                      <div
                        key={escalation.id}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {escalation.incident}
                            </h3>
                            <Badge
                              variant={
                                escalation.priority === "Critical"
                                  ? "destructive"
                                  : "default"
                              }
                            >
                              {escalation.priority}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {escalation.level}
                          </span>
                        </div>
                        <p className="text-sm mb-3">{escalation.title}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4 text-sm">
                            <span>
                              Time to escalation:{" "}
                              <strong>{escalation.timeToEscalation}</strong>
                            </span>
                            <span>
                              Assigned to:{" "}
                              <strong>{escalation.assignedTo}</strong>
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                alert(
                                  `Viewing details for ${escalation.incident}\n\nTitle: ${escalation.title}\nPriority: ${escalation.priority}\nAssigned to: ${escalation.assignedTo}\nTime to escalation: ${escalation.timeToEscalation}`,
                                )
                              }
                            >
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                handleEscalateIncident(escalation.incident)
                              }
                            >
                              Escalate Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Active Escalations
                    </h3>
                    <p className="text-muted-foreground">
                      All incidents are currently within SLA targets.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Tabs defaultValue="available" className="space-y-6">
              <TabsList>
                <TabsTrigger value="available">Available Reports</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
              </TabsList>

              <TabsContent value="available">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Available Reports</CardTitle>
                      <CardDescription>
                        Generate and download SLA reports
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleGenerateReport("monthly")}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Monthly SLA Summary
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleGenerateReport("performance")}
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Performance Trends
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleGenerateReport("breach")}
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Breach Analysis
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleGenerateReport("team")}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Team Performance
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Export Options</CardTitle>
                      <CardDescription>
                        Download reports in different formats
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button
                        className="w-full"
                        onClick={() => handleExportPDF("performance")}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Export to PDF
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleExportExcel("performance")}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export to Excel
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowScheduleModal(true)}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Schedule Email Report
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="scheduled">
                <Card>
                  <CardHeader>
                    <CardTitle>Scheduled Reports</CardTitle>
                    <CardDescription>
                      Manage automated report delivery
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No Scheduled Reports
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Set up automated report delivery to your team.
                      </p>
                      <Button onClick={() => setShowScheduleModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Schedule New Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* Configure SLA Modal */}
        <Modal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          title="Configure New SLA"
          description="Create a new service level agreement"
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">SLA Name *</label>
              <Input
                placeholder="Enter SLA name"
                value={newSLA.name}
                onChange={(e) => setNewSLA({ ...newSLA, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Priority Level *</label>
              <Select
                value={newSLA.priorityLevel}
                onValueChange={(value) =>
                  setNewSLA({ ...newSLA, priorityLevel: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Target Hours *</label>
              <Input
                type="number"
                placeholder="Enter target hours"
                value={newSLA.targetHours}
                onChange={(e) =>
                  setNewSLA({ ...newSLA, targetHours: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Enter SLA description"
                value={newSLA.description}
                onChange={(e) =>
                  setNewSLA({ ...newSLA, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowConfigModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateSLA}>Create SLA</Button>
            </div>
          </div>
        </Modal>

        {/* Alerts Modal */}
        <Modal
          isOpen={showAlertsModal}
          onClose={() => setShowAlertsModal(false)}
          title="Alert Configuration"
          description="Configure SLA breach alerts and notifications"
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Alert Type</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select alert type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breach">SLA Breach</SelectItem>
                  <SelectItem value="warning">SLA Warning</SelectItem>
                  <SelectItem value="escalation">
                    Escalation Required
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Notification Method</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="teams">Microsoft Teams</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Recipients</label>
              <Input
                placeholder="Enter email addresses separated by commas"
                onChange={(e) => {/* Handle recipients */}}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Trigger Conditions</label>
              <Textarea
                placeholder="Describe when this alert should trigger..."
                rows={3}
                onChange={(e) => {/* Handle conditions */}}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAlertsModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  alert("Alert configuration saved successfully!");
                  setShowAlertsModal(false);
                }}
              >
                Save Alert
              </Button>
            </div>
          </div>
        </Modal>

        {/* Schedule Report Modal */}
        <Modal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          title="Schedule Email Report"
          description="Set up automated report delivery"
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Report Type</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly SLA Summary</SelectItem>
                  <SelectItem value="performance">
                    Performance Trends
                  </SelectItem>
                  <SelectItem value="breach">Breach Analysis</SelectItem>
                  <SelectItem value="team">Team Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Email Recipients</label>
              <Input
                placeholder="Enter email addresses separated by commas"
                onChange={(e) => {/* Handle email recipients */}}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Frequency</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                onChange={(e) => {/* Handle start date */}}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowScheduleModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  alert("Email report scheduled successfully!");
                  setShowScheduleModal(false);
                }}
              >
                Schedule Report
              </Button>
            </div>
          </div>
        </Modal>

        {/* Edit SLA Modal */}
        {editingSLA && (
          <Modal
            isOpen={!!editingSLA}
            onClose={() => setEditingSLA(null)}
            title="Edit SLA Performance"
            description={`Modify settings for ${editingSLA.name}`}
            maxWidth="max-w-lg"
          >
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">SLA Name</label>
                <Input value={editingSLA.name} readOnly className="bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium">Current Target</label>
                <Input
                  value={editingSLA.target}
                  onChange={(e) => setEditingSLA({...editingSLA, target: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Priority Level</label>
                <Select defaultValue={editingSLA.priority || "medium"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  Current Compliance
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value={`${editingSLA.compliance}%`}
                    readOnly
                    className="bg-muted"
                  />
                  <Badge
                    variant={
                      editingSLA.status === "on_track"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {editingSLA.status === "on_track" ? "On Track" : "Breached"}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Escalation Rules</label>
                <Textarea
                  placeholder="Define escalation procedures..."
                  rows={3}
                  onChange={(e) => {/* Handle escalation rules */}}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingSLA(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    alert("SLA settings updated successfully!");
                    setEditingSLA(null);
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
