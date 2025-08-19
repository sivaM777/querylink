import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Plus,
  Loader2,
  Trash2,
  Wrench,
  FileText,
  Github,
  BookOpen,
  Building2,
  MessageSquare,
  Notebook,
  Brain,
  FileCode,
  Database,
  GitBranch,
  Search,
  Users,
  Calendar,
  Archive,
  Code,
  Bug,
  Target,
  Link,
  Zap,
  Shield,
  BarChart3,
  Clock,
  Tags,
  Globe,
  Mail,
  Phone,
  Video,
  HelpCircle,
  RefreshCw,
  Star,
  Eye,
} from "lucide-react";
import { useAlert } from "@/components/CustomAlert";
import { cn } from "@/lib/utils";

interface SystemConnection {
  name: string;
  status: "connected" | "disconnected" | "error";
  icon: string;
  color: string;
  lastSync?: string;
  recordCount?: number;
}

interface SystemStatusProps {
  systems: SystemConnection[];
  onConfigureSystem?: (systemName: string) => void;
  onAddSystem?: (
    systemData: Omit<SystemConnection, "status" | "lastSync" | "recordCount">,
  ) => void;
  onRemoveSystem?: (systemName: string) => void;
  configuringSystem?: string | null;
  onResetSystems?: () => void;
}

const statusConfig = {
  connected: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor:
      "bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    label: "Connected",
  },
  disconnected: {
    icon: XCircle,
    color: "text-gray-600",
    bgColor:
      "bg-gray-100 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800",
    label: "Disconnected",
  },
  error: {
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    label: "Error",
  },
};

// Helper function to get proper icon components
const getSystemIcon = (systemName: string) => {
  switch (systemName) {
    case "Jira Cloud":
      return <Wrench className="h-4 w-4 text-blue-600" />;
    case "Confluence":
      return <BookOpen className="h-4 w-4 text-blue-500" />;
    case "GitHub":
      return <Github className="h-4 w-4 text-gray-800" />;
    case "ServiceNow KB":
      return <BookOpen className="h-4 w-4 text-green-600" />;
    case "ServiceNow ITSM":
      return <Building2 className="h-4 w-4 text-green-600" />;
    case "Microsoft Teams":
      return <MessageSquare className="h-4 w-4 text-blue-600" />;
    case "Slack":
      return <MessageSquare className="h-4 w-4 text-purple-500" />;
    case "Zendesk":
      return <Building2 className="h-4 w-4 text-green-500" />;
    case "Linear":
      return <FileText className="h-4 w-4 text-purple-600" />;
    case "Notion":
      return <Notebook className="h-4 w-4 text-gray-700" />;
    case "Custom API":
      return <FileCode className="h-4 w-4 text-orange-500" />;
    default:
      return <Database className="h-4 w-4 text-gray-500" />;
  }
};

// System Features Dialog Component
interface SystemFeaturesDialogProps {
  systemName: string;
  isOpen: boolean;
  onClose: () => void;
}

function SystemFeaturesDialog({
  systemName,
  isOpen,
  onClose,
}: SystemFeaturesDialogProps) {
  const getSystemFeatures = (systemName: string) => {
    const commonFeatures = {
      "Real-time search integration": {
        icon: Search,
        description:
          "Search across all content in real-time with instant indexing",
      },
      "Advanced analytics": {
        icon: BarChart3,
        description:
          "Track usage patterns, performance metrics, and system health",
      },
      "24/7 monitoring": {
        icon: Eye,
        description:
          "Continuous system health monitoring with proactive alerts",
      },
    };

    const systemFeatures: Record<string, any> = {
      "Jira Cloud": {
        category: "Issue Tracking & Project Management",
        features: {
          "Issue tracking integration": {
            icon: Bug,
            description:
              "Search and track issues across all projects with advanced filtering",
          },
          "Sprint planning support": {
            icon: Target,
            description:
              "Access sprint data, burndown charts, and planning information",
          },
          "Automated ticket linking": {
            icon: Link,
            description: "Automatically link related tickets and suggestions",
          },
          "Smart suggestion matching": {
            icon: Brain,
            description: "AI-powered matching of issues to relevant solutions",
          },
          "Custom field mapping": {
            icon: Settings,
            description:
              "Map custom fields for enhanced data organization and search",
          },
          "Workflow automation": {
            icon: Zap,
            description: "Automated workflow triggers and intelligent actions",
          },
          "Advanced reporting": {
            icon: BarChart3,
            description: "Generate comprehensive project reports and insights",
          },
          "User permission sync": {
            icon: Shield,
            description: "Sync user permissions and access levels seamlessly",
          },
          "Comment & attachment search": {
            icon: Search,
            description:
              "Search through comments, attachments, and linked content",
          },
          "Real-time notifications": {
            icon: RefreshCw,
            description: "Get notified of issue updates and changes instantly",
          },
          "Epic and sprint integration": {
            icon: Calendar,
            description: "Full integration with epics, sprints, and roadmaps",
          },
          "Priority-based suggestion ranking": {
            icon: Star,
            description: "Suggestions ranked by issue priority and urgency",
          },
          ...commonFeatures,
        },
      },
      Confluence: {
        category: "Knowledge Base & Documentation",
        features: {
          "Page content indexing": {
            icon: FileText,
            description:
              "Index all page content for comprehensive full-text search",
          },
          "Space-based organization": {
            icon: Archive,
            description:
              "Organize content by spaces with hierarchical navigation",
          },
          "Version history tracking": {
            icon: Clock,
            description: "Track document versions, changes, and edit history",
          },
          "Macro content extraction": {
            icon: Code,
            description: "Extract and index content from Confluence macros",
          },
          "Comment integration": {
            icon: MessageSquare,
            description: "Search through page comments and team discussions",
          },
          "Label & tag support": {
            icon: Tags,
            description:
              "Utilize labels and tags for smart content organization",
          },
          "Attachment processing": {
            icon: Link,
            description: "Process and index file attachments with OCR support",
          },
          "Permission-aware search": {
            icon: Shield,
            description: "Respect user permissions in all search results",
          },
          "Template management": {
            icon: FileCode,
            description: "Access and search through page templates",
          },
          "Cross-space discovery": {
            icon: Globe,
            description: "Discover related content across multiple spaces",
          },
          "Collaborative editing support": {
            icon: Users,
            description: "Track collaborative edits and team contributions",
          },
          "Smart content recommendations": {
            icon: Brain,
            description: "AI-powered content recommendations based on context",
          },
          ...commonFeatures,
        },
      },
      GitHub: {
        category: "Code Repository & Development",
        features: {
          "Repository integration": {
            icon: Database,
            description:
              "Access all repository data, metadata, and project information",
          },
          "Issue & PR tracking": {
            icon: GitBranch,
            description:
              "Track issues, pull requests, and development discussions",
          },
          "Code search capabilities": {
            icon: Code,
            description: "Search through code files, functions, and snippets",
          },
          "Commit history analysis": {
            icon: Clock,
            description:
              "Analyze commit history, changes, and development patterns",
          },
          "Wiki integration": {
            icon: BookOpen,
            description: "Include repository wikis and documentation in search",
          },
          "Release notes tracking": {
            icon: Star,
            description:
              "Track releases, deployment notes, and version history",
          },
          "Contributor insights": {
            icon: Users,
            description:
              "Analyze contributor activity, expertise, and patterns",
          },
          "Branch management": {
            icon: GitBranch,
            description:
              "Monitor branch creation, merging, and workflow patterns",
          },
          "Security vulnerability scanning": {
            icon: Shield,
            description: "Integrate security insights and vulnerability data",
          },
          "Automated code suggestions": {
            icon: Brain,
            description:
              "AI-powered code suggestions based on repository patterns",
          },
          "Webhook real-time updates": {
            icon: RefreshCw,
            description: "Real-time updates via webhook integration",
          },
          "Project board integration": {
            icon: Target,
            description: "Access GitHub Projects and planning boards",
          },
          ...commonFeatures,
        },
      },
      "ServiceNow KB": {
        category: "Knowledge Management & ITSM",
        features: {
          "Knowledge article integration": {
            icon: BookOpen,
            description:
              "Search through comprehensive knowledge articles and solutions",
          },
          "Incident resolution guides": {
            icon: HelpCircle,
            description: "Access step-by-step incident resolution procedures",
          },
          "Best practice recommendations": {
            icon: Star,
            description: "AI-powered best practice suggestions and templates",
          },
          "ITSM workflow integration": {
            icon: Zap,
            description:
              "Seamless integration with ITSM workflows and processes",
          },
          "Automated incident categorization": {
            icon: Tags,
            description:
              "Automatically categorize and tag incidents for better organization",
          },
          "SLA-aware suggestion prioritization": {
            icon: Clock,
            description:
              "Prioritize suggestions based on SLA requirements and urgency",
          },
          "Change management integration": {
            icon: RefreshCw,
            description:
              "Integrate with change management processes and approvals",
          },
          "Problem management correlation": {
            icon: Bug,
            description:
              "Correlate incidents with known problems and root causes",
          },
          "Service catalog integration": {
            icon: Building2,
            description:
              "Access service catalog items and related documentation",
          },
          "CMDB relationship mapping": {
            icon: Database,
            description: "Map configuration items and service relationships",
          },
          "Approval workflow tracking": {
            icon: Shield,
            description: "Track article approval workflows and governance",
          },
          "Multi-language support": {
            icon: Globe,
            description:
              "Support for multiple language variants and localization",
          },
          ...commonFeatures,
        },
      },
      "ServiceNow ITSM": {
        category: "IT Service Management",
        features: {
          "Incident management": {
            icon: AlertCircle,
            description:
              "Comprehensive incident tracking and resolution workflows",
          },
          "Service catalog integration": {
            icon: Building2,
            description:
              "Access service catalog items, requests, and fulfillment",
          },
          "Change management": {
            icon: RefreshCw,
            description:
              "Monitor change requests, approvals, and implementations",
          },
          "Problem resolution tracking": {
            icon: Bug,
            description:
              "Track problem records, root cause analysis, and solutions",
          },
          "SLA monitoring": {
            icon: Clock,
            description:
              "Monitor service level agreements and performance metrics",
          },
          "Asset management": {
            icon: Database,
            description:
              "Track IT assets, configuration items, and dependencies",
          },
          "Workflow automation": {
            icon: Zap,
            description: "Automate ITSM workflows and business processes",
          },
          "Custom form integration": {
            icon: Settings,
            description:
              "Support for custom forms, fields, and data structures",
          },
          "Knowledge base correlation": {
            icon: BookOpen,
            description: "Correlate incidents with knowledge base articles",
          },
          "Service mapping": {
            icon: Globe,
            description: "Map service dependencies and business impact",
          },
          "Reporting & analytics": {
            icon: BarChart3,
            description: "Advanced reporting and business intelligence",
          },
          "Mobile workforce support": {
            icon: Phone,
            description: "Support for mobile workforce and field operations",
          },
          ...commonFeatures,
        },
      },
      Slack: {
        category: "Team Communication & Collaboration",
        features: {
          "Channel message search": {
            icon: MessageSquare,
            description:
              "Search across all channel messages with context awareness",
          },
          "Direct message indexing": {
            icon: Mail,
            description: "Index direct messages with proper privacy controls",
          },
          "File sharing integration": {
            icon: Link,
            description: "Access shared files, documents, and media content",
          },
          "Thread conversation tracking": {
            icon: Users,
            description: "Track threaded conversations and discussion context",
          },
          "Emoji & reaction analysis": {
            icon: Star,
            description: "Analyze message reactions, sentiment, and engagement",
          },
          "Bot integration support": {
            icon: Brain,
            description:
              "Integrate with Slack bots, automations, and workflows",
          },
          "Workspace analytics": {
            icon: BarChart3,
            description:
              "Analyze workspace activity, usage patterns, and trends",
          },
          "Custom status tracking": {
            icon: Eye,
            description: "Monitor user statuses, availability, and presence",
          },
          "App ecosystem integration": {
            icon: Zap,
            description: "Connect with Slack apps and third-party integrations",
          },
          "Channel archival search": {
            icon: Archive,
            description: "Search through archived channels and historical data",
          },
          "Mention & notification tracking": {
            icon: RefreshCw,
            description: "Track mentions, notifications, and important updates",
          },
          "Workflow builder integration": {
            icon: Settings,
            description:
              "Integrate with Slack's workflow builder and automations",
          },
          ...commonFeatures,
        },
      },
      "Microsoft Teams": {
        category: "Enterprise Communication & Collaboration",
        features: {
          "Teams & channel integration": {
            icon: Users,
            description:
              "Access team channels, conversations, and collaboration spaces",
          },
          "Meeting transcription search": {
            icon: Video,
            description:
              "Search through meeting transcriptions and recorded content",
          },
          "File collaboration": {
            icon: FileText,
            description:
              "Access shared files, collaborative documents, and version history",
          },
          "Calendar integration": {
            icon: Calendar,
            description:
              "Integrate with team calendars, meetings, and scheduling",
          },
          "Call & video analytics": {
            icon: Phone,
            description:
              "Analyze communication patterns, call quality, and usage",
          },
          "SharePoint integration": {
            icon: Database,
            description:
              "Connect with SharePoint sites, libraries, and content",
          },
          "App ecosystem support": {
            icon: Zap,
            description:
              "Support for Teams apps, tabs, and custom integrations",
          },
          "Compliance & retention": {
            icon: Shield,
            description:
              "Comply with enterprise retention policies and governance",
          },
          "Live event integration": {
            icon: Globe,
            description:
              "Access live events, broadcasts, and organizational content",
          },
          "Power Platform integration": {
            icon: Brain,
            description: "Integrate with Power BI, Power Apps, and automation",
          },
          "OneDrive file access": {
            icon: Archive,
            description: "Search through OneDrive files and personal storage",
          },
          "Cross-tenant collaboration": {
            icon: Link,
            description: "Support for external collaboration and guest access",
          },
          ...commonFeatures,
        },
      },
      Zendesk: {
        category: "Customer Support & Ticketing",
        features: {
          "Ticket search & tracking": {
            icon: HelpCircle,
            description:
              "Search through support tickets, conversations, and history",
          },
          "Customer interaction history": {
            icon: Users,
            description:
              "Track complete customer interaction timelines and context",
          },
          "Knowledge base integration": {
            icon: BookOpen,
            description:
              "Integrate with Zendesk knowledge base and help articles",
          },
          "Agent performance analytics": {
            icon: BarChart3,
            description: "Analyze agent performance, productivity, and metrics",
          },
          "SLA & escalation tracking": {
            icon: Clock,
            description:
              "Monitor SLA compliance, escalations, and response times",
          },
          "Multi-channel support": {
            icon: MessageSquare,
            description: "Support tickets from email, chat, phone, and social",
          },
          "Custom field integration": {
            icon: Settings,
            description:
              "Utilize custom fields for enhanced categorization and routing",
          },
          "Satisfaction surveys": {
            icon: Star,
            description:
              "Include customer satisfaction data and feedback analysis",
          },
          "Automation & triggers": {
            icon: Zap,
            description: "Automate workflows with triggers and business rules",
          },
          "Community forum integration": {
            icon: Users,
            description: "Connect community forums and user-generated content",
          },
          "API & webhook support": {
            icon: Link,
            description: "Comprehensive API access and webhook integrations",
          },
          "Mobile agent support": {
            icon: Phone,
            description:
              "Support for mobile agents and field service operations",
          },
          ...commonFeatures,
        },
      },
      Linear: {
        category: "Issue Tracking & Product Management",
        features: {
          "Issue tracking & planning": {
            icon: Target,
            description:
              "Track issues, features, and product planning with precision",
          },
          "Project milestone tracking": {
            icon: Calendar,
            description:
              "Monitor project milestones, deadlines, and deliverables",
          },
          "Team productivity insights": {
            icon: BarChart3,
            description:
              "Analyze team productivity, velocity, and performance metrics",
          },
          "Cycle planning support": {
            icon: RefreshCw,
            description:
              "Support for development cycles, sprints, and iterations",
          },
          "Roadmap integration": {
            icon: Eye,
            description:
              "Access product roadmaps, strategic planning, and vision",
          },
          "Priority & label management": {
            icon: Tags,
            description: "Utilize priorities, labels, and smart categorization",
          },
          "Git integration support": {
            icon: GitBranch,
            description:
              "Connect with Git repositories, commits, and deployments",
          },
          "Triage & workflow automation": {
            icon: Zap,
            description:
              "Automate issue triage, routing, and workflow processes",
          },
          "SLA & response tracking": {
            icon: Clock,
            description: "Track response times, SLAs, and resolution metrics",
          },
          "Team collaboration tools": {
            icon: Users,
            description:
              "Enhanced collaboration with comments, mentions, and updates",
          },
          "API & integration support": {
            icon: Link,
            description:
              "Comprehensive API access and third-party integrations",
          },
          "Advanced filtering & search": {
            icon: Search,
            description: "Powerful filtering, search, and query capabilities",
          },
          ...commonFeatures,
        },
      },
      Notion: {
        category: "Workspace & Knowledge Management",
        features: {
          "Page & database search": {
            icon: Database,
            description:
              "Search through pages, databases, and structured content",
          },
          "Block-level content indexing": {
            icon: FileText,
            description:
              "Index individual content blocks for precise search results",
          },
          "Template & gallery access": {
            icon: Archive,
            description: "Access templates, galleries, and community resources",
          },
          "Collaboration tracking": {
            icon: Users,
            description:
              "Track collaborative edits, comments, and team contributions",
          },
          "Property & relation support": {
            icon: Link,
            description:
              "Utilize database properties, relations, and connections",
          },
          "Media & file integration": {
            icon: Star,
            description: "Index embedded media, files, and multimedia content",
          },
          "Workspace organization": {
            icon: Archive,
            description:
              "Organize content by workspaces with hierarchical structure",
          },
          "Version history access": {
            icon: Clock,
            description:
              "Access page version history, changes, and edit tracking",
          },
          "Formula & automation support": {
            icon: Brain,
            description:
              "Support for formulas, automations, and computed fields",
          },
          "API & integration ecosystem": {
            icon: Zap,
            description:
              "Connect with APIs and third-party integration ecosystem",
          },
          "Cross-workspace search": {
            icon: Globe,
            description:
              "Search across multiple workspaces and team boundaries",
          },
          "Advanced permissions": {
            icon: Shield,
            description: "Granular permissions and access control management",
          },
          ...commonFeatures,
        },
      },
    };

    return (
      systemFeatures[systemName] || {
        category: "General Integration",
        features: commonFeatures,
      }
    );
  };

  const systemData = getSystemFeatures(systemName);
  const featureEntries = Object.entries(systemData.features);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getSystemIcon(systemName)}
            <div>
              <DialogTitle className="text-xl font-bold">
                {systemName} Features
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {systemData.category}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto space-y-4 max-h-[60vh]">
          <div className="grid gap-3">
            {featureEntries.map(([featureName, feature]) => {
              const FeatureIcon = feature.icon;
              return (
                <div
                  key={featureName}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FeatureIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <h4
                        className="font-medium text-sm text-gray-900 dark:text-white"
                      >
                        {featureName}
                      </h4>
                    </div>
                    <p
                      className="text-sm leading-relaxed text-gray-700 dark:text-gray-300"
                    >
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-blue-600" />
              <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                Advanced Integration Benefits
              </h4>
            </div>
            <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
              <li>• Enhanced search relevance with system-specific context</li>
              <li>• Seamless cross-platform data correlation</li>
              <li>• Automated workflow triggers and notifications</li>
              <li>• Comprehensive audit trails and compliance tracking</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onClose}>Configure Integration</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SystemStatus({
  systems,
  onConfigureSystem,
  onAddSystem,
  onRemoveSystem,
  configuringSystem,
  onResetSystems,
}: SystemStatusProps) {
  const { showConfirm } = useAlert();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [featuresDialogSystem, setFeaturesDialogSystem] = useState<
    string | null
  >(null);
  const [newSystemData, setNewSystemData] = useState({
    name: "",
    icon: "🔗",
    color: "bg-blue-500",
  });
  const [customName, setCustomName] = useState("");

  const allAvailableSystems = [
    { name: "Jira Cloud", icon: "🔧", color: "bg-ql-jira" },
    { name: "Confluence", icon: "📋", color: "bg-ql-confluence" },
    { name: "GitHub", icon: "🐙", color: "bg-ql-github" },
    { name: "ServiceNow KB", icon: "📚", color: "bg-ql-servicenow" },
    { name: "Slack", icon: "💬", color: "bg-purple-500" },
    { name: "Microsoft Teams", icon: "👥", color: "bg-blue-600" },
    { name: "ServiceNow ITSM", icon: "🎫", color: "bg-green-600" },
    { name: "Zendesk", icon: "����", color: "bg-green-500" },
    { name: "Linear", icon: "📋", color: "bg-purple-600" },
    { name: "Notion", icon: "📝", color: "bg-gray-700" },
    { name: "Custom API", icon: "🔧", color: "bg-orange-500" },
  ];

  // Filter out systems that are already added
  const availableSystems = allAvailableSystems.filter(
    (availableSystem) =>
      !systems.some(
        (existingSystem) => existingSystem.name === availableSystem.name,
      ),
  );

  const handleAddSystem = () => {
    const systemToAdd =
      newSystemData.name === "Custom API" && customName.trim()
        ? { ...newSystemData, name: customName.trim() }
        : newSystemData;

    if (systemToAdd.name && onAddSystem) {
      onAddSystem(systemToAdd);
      setNewSystemData({ name: "", icon: "🔗", color: "bg-blue-500" });
      setCustomName("");
      setIsAddDialogOpen(false);
    }
  };

  // System Features Data
  const getSystemFeatures = (systemName: string) => {
    const commonFeatures = {
      "Real-time search integration": {
        icon: Search,
        description: "Search across all content in real-time",
      },
      "Advanced analytics": {
        icon: BarChart3,
        description: "Track usage patterns and performance metrics",
      },
      "24/7 monitoring": {
        icon: Eye,
        description: "Continuous system health monitoring",
      },
    };

    const systemFeatures: Record<string, any> = {
      "Jira Cloud": {
        category: "Issue Tracking & Project Management",
        features: {
          "Issue tracking integration": {
            icon: Bug,
            description: "Search and track issues across projects",
          },
          "Sprint planning support": {
            icon: Target,
            description: "Access sprint data and planning information",
          },
          "Custom field mapping": {
            icon: Settings,
            description: "Map custom fields for better data organization",
          },
          "Workflow automation": {
            icon: Zap,
            description: "Automated workflow triggers and actions",
          },
          "Advanced reporting": {
            icon: BarChart3,
            description: "Generate comprehensive project reports",
          },
          "User permission sync": {
            icon: Shield,
            description: "Sync user permissions and access levels",
          },
          "Comment & attachment search": {
            icon: Search,
            description: "Search through comments and attachments",
          },
          "Real-time notifications": {
            icon: RefreshCw,
            description: "Get notified of issue updates instantly",
          },
          ...commonFeatures,
        },
      },
      Confluence: {
        category: "Knowledge Base & Documentation",
        features: {
          "Page content indexing": {
            icon: FileText,
            description: "Index all page content for comprehensive search",
          },
          "Space-based organization": {
            icon: Archive,
            description: "Organize content by spaces and hierarchies",
          },
          "Version history tracking": {
            icon: Clock,
            description: "Track document versions and changes",
          },
          "Macro content extraction": {
            icon: Code,
            description: "Extract content from Confluence macros",
          },
          "Comment integration": {
            icon: MessageSquare,
            description: "Search through page comments and discussions",
          },
          "Label & tag support": {
            icon: Tags,
            description: "Utilize labels and tags for content organization",
          },
          "Attachment processing": {
            icon: Link,
            description: "Process and index file attachments",
          },
          "Permission-aware search": {
            icon: Shield,
            description: "Respect user permissions in search results",
          },
          ...commonFeatures,
        },
      },
      GitHub: {
        category: "Code Repository & Development",
        features: {
          "Repository integration": {
            icon: Database,
            description: "Access all repository data and metadata",
          },
          "Issue & PR tracking": {
            icon: GitBranch,
            description: "Track issues, pull requests, and discussions",
          },
          "Code search capabilities": {
            icon: Code,
            description: "Search through code files and snippets",
          },
          "Commit history analysis": {
            icon: Clock,
            description: "Analyze commit history and changes",
          },
          "Wiki integration": {
            icon: BookOpen,
            description: "Include repository wikis in search results",
          },
          "Release notes tracking": {
            icon: Star,
            description: "Track releases and deployment notes",
          },
          "Contributor insights": {
            icon: Users,
            description: "Analyze contributor activity and patterns",
          },
          "Branch management": {
            icon: GitBranch,
            description: "Monitor branch creation and merging",
          },
          ...commonFeatures,
        },
      },
      "ServiceNow KB": {
        category: "Knowledge Management & ITSM",
        features: {
          "Knowledge article search": {
            icon: BookOpen,
            description: "Search through knowledge articles and solutions",
          },
          "Category-based filtering": {
            icon: Archive,
            description: "Filter content by categories and topics",
          },
          "Approval workflow tracking": {
            icon: Shield,
            description: "Track article approval workflows",
          },
          "Usage analytics": {
            icon: BarChart3,
            description: "Monitor article usage and effectiveness",
          },
          "Rating & feedback": {
            icon: Star,
            description: "Include article ratings in relevance scoring",
          },
          "Multi-language support": {
            icon: Globe,
            description: "Support for multiple language variants",
          },
          "Attachment indexing": {
            icon: Link,
            description: "Index and search attached documents",
          },
          "Lifecycle management": {
            icon: RefreshCw,
            description: "Track article lifecycle and updates",
          },
          ...commonFeatures,
        },
      },
      "ServiceNow ITSM": {
        category: "IT Service Management",
        features: {
          "Incident management": {
            icon: AlertCircle,
            description: "Track and manage IT incidents",
          },
          "Service catalog integration": {
            icon: Building2,
            description: "Access service catalog items and workflows",
          },
          "Change management": {
            icon: RefreshCw,
            description: "Monitor change requests and implementations",
          },
          "Problem resolution tracking": {
            icon: Bug,
            description: "Track problem records and root cause analysis",
          },
          "SLA monitoring": {
            icon: Clock,
            description: "Monitor service level agreements and metrics",
          },
          "Asset management": {
            icon: Database,
            description: "Track IT assets and configuration items",
          },
          "Workflow automation": {
            icon: Zap,
            description: "Automate ITSM workflows and processes",
          },
          "Custom form integration": {
            icon: Settings,
            description: "Support for custom forms and fields",
          },
          ...commonFeatures,
        },
      },
      Slack: {
        category: "Team Communication & Collaboration",
        features: {
          "Channel message search": {
            icon: MessageSquare,
            description: "Search across all channel messages",
          },
          "Direct message indexing": {
            icon: Mail,
            description: "Index direct messages (with permission)",
          },
          "File sharing integration": {
            icon: Link,
            description: "Access shared files and documents",
          },
          "Thread conversation tracking": {
            icon: Users,
            description: "Track threaded conversations and replies",
          },
          "Emoji & reaction analysis": {
            icon: Star,
            description: "Analyze message reactions and engagement",
          },
          "Bot integration support": {
            icon: Brain,
            description: "Integrate with Slack bots and automations",
          },
          "Workspace analytics": {
            icon: BarChart3,
            description: "Analyze workspace activity and usage",
          },
          "Custom status tracking": {
            icon: Eye,
            description: "Monitor user statuses and availability",
          },
          ...commonFeatures,
        },
      },
      "Microsoft Teams": {
        category: "Enterprise Communication & Collaboration",
        features: {
          "Teams & channel integration": {
            icon: Users,
            description: "Access team channels and conversations",
          },
          "Meeting transcription search": {
            icon: Video,
            description: "Search through meeting transcriptions",
          },
          "File collaboration": {
            icon: FileText,
            description: "Access shared files and collaborative documents",
          },
          "Calendar integration": {
            icon: Calendar,
            description: "Integrate with team calendars and schedules",
          },
          "Call & video analytics": {
            icon: Phone,
            description: "Analyze communication patterns and usage",
          },
          "SharePoint integration": {
            icon: Database,
            description: "Connect with SharePoint sites and content",
          },
          "App ecosystem support": {
            icon: Zap,
            description: "Support for Teams apps and integrations",
          },
          "Compliance & retention": {
            icon: Shield,
            description: "Comply with enterprise retention policies",
          },
          ...commonFeatures,
        },
      },
      Zendesk: {
        category: "Customer Support & Ticketing",
        features: {
          "Ticket search & tracking": {
            icon: HelpCircle,
            description: "Search through support tickets and conversations",
          },
          "Customer interaction history": {
            icon: Users,
            description: "Track complete customer interaction timelines",
          },
          "Knowledge base integration": {
            icon: BookOpen,
            description: "Integrate with Zendesk knowledge base articles",
          },
          "Agent performance analytics": {
            icon: BarChart3,
            description: "Analyze agent performance and productivity",
          },
          "SLA & escalation tracking": {
            icon: Clock,
            description: "Monitor SLA compliance and escalations",
          },
          "Multi-channel support": {
            icon: MessageSquare,
            description: "Support tickets from email, chat, phone",
          },
          "Custom field integration": {
            icon: Settings,
            description: "Utilize custom fields for enhanced categorization",
          },
          "Satisfaction surveys": {
            icon: Star,
            description: "Include customer satisfaction data",
          },
          ...commonFeatures,
        },
      },
      Linear: {
        category: "Issue Tracking & Product Management",
        features: {
          "Issue tracking & planning": {
            icon: Target,
            description: "Track issues, features, and product planning",
          },
          "Project milestone tracking": {
            icon: Calendar,
            description: "Monitor project milestones and deadlines",
          },
          "Team productivity insights": {
            icon: BarChart3,
            description: "Analyze team productivity and velocity",
          },
          "Cycle planning support": {
            icon: RefreshCw,
            description: "Support for development cycles and sprints",
          },
          "Roadmap integration": {
            icon: Eye,
            description: "Access product roadmaps and strategic planning",
          },
          "Priority & label management": {
            icon: Tags,
            description: "Utilize priorities and labels for organization",
          },
          "Git integration support": {
            icon: GitBranch,
            description: "Connect with Git repositories and commits",
          },
          "Triage & workflow automation": {
            icon: Zap,
            description: "Automate issue triage and workflows",
          },
          ...commonFeatures,
        },
      },
      Notion: {
        category: "Workspace & Knowledge Management",
        features: {
          "Page & database search": {
            icon: Database,
            description: "Search through pages, databases, and content",
          },
          "Block-level content indexing": {
            icon: FileText,
            description: "Index individual content blocks for precision",
          },
          "Template & gallery access": {
            icon: Archive,
            description: "Access templates and shared galleries",
          },
          "Collaboration tracking": {
            icon: Users,
            description: "Track collaborative edits and comments",
          },
          "Property & relation support": {
            icon: Link,
            description: "Utilize database properties and relations",
          },
          "Media & file integration": {
            icon: Star,
            description: "Index embedded media and file attachments",
          },
          "Workspace organization": {
            icon: Archive,
            description: "Organize content by workspaces and hierarchies",
          },
          "Version history access": {
            icon: Clock,
            description: "Access page version history and changes",
          },
          ...commonFeatures,
        },
      },
      "Custom API": {
        category: "Custom Integration & Data Sources",
        features: {
          "Flexible endpoint configuration": {
            icon: Settings,
            description: "Configure custom API endpoints and parameters",
          },
          "Authentication support": {
            icon: Shield,
            description: "Support for various authentication methods",
          },
          "Data transformation": {
            icon: RefreshCw,
            description: "Transform and normalize incoming data",
          },
          "Rate limiting management": {
            icon: Clock,
            description: "Manage API rate limits and throttling",
          },
          "Custom field mapping": {
            icon: Link,
            description: "Map custom fields to QueryLinker schema",
          },
          "Webhook integration": {
            icon: Zap,
            description: "Support for real-time webhook notifications",
          },
          "Error handling & retry": {
            icon: AlertCircle,
            description: "Robust error handling and retry mechanisms",
          },
          "Data validation": {
            icon: Shield,
            description: "Validate incoming data against schemas",
          },
          ...commonFeatures,
        },
      },
    };

    return (
      systemFeatures[systemName] || {
        category: "General Integration",
        features: commonFeatures,
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Integrations
            </CardTitle>
            <CardDescription>
              Connected systems and their status
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {onResetSystems && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onResetSystems}
                className="text-xs"
              >
                Reset
              </Button>
            )}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={availableSystems.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add System
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New System Integration</DialogTitle>
                  <DialogDescription>
                    Connect a new system to expand your knowledge sources and
                    improve suggestion coverage.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {availableSystems.length > 0 ? (
                    <div className="space-y-2">
                      <Label htmlFor="system-select">Select System</Label>
                      <Select
                        value={newSystemData.name}
                        onValueChange={(value) => {
                          const selected = availableSystems.find(
                            (s) => s.name === value,
                          );
                          if (selected) {
                            setNewSystemData({
                              name: selected.name,
                              icon: selected.icon,
                              color: selected.color,
                            });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a system to integrate" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSystems.map((system) => (
                            <SelectItem key={system.name} value={system.name}>
                              <div className="flex items-center gap-2">
                                {getSystemIcon(system.name)}
                                <span>{system.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-700 dark:text-gray-300">
                      <p className="text-sm">
                        All available systems have been added.
                      </p>
                      <p className="text-xs mt-1">
                        You can configure existing systems using the settings
                        button.
                      </p>
                    </div>
                  )}

                  {newSystemData.name === "Custom API" && (
                    <div className="space-y-2">
                      <Label htmlFor="custom-name">Custom System Name</Label>
                      <Input
                        id="custom-name"
                        placeholder="Enter custom system name (e.g., ITSM Portal, DevOps Tools)"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                      />
                    </div>
                  )}

                  {availableSystems.length > 0 && (
                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddSystem}
                        disabled={
                          !newSystemData.name ||
                          newSystemData.name === "" ||
                          (newSystemData.name === "Custom API" &&
                            !customName.trim())
                        }
                      >
                        Add Integration
                      </Button>
                    </div>
                  )}

                  {availableSystems.length === 0 && (
                    <div className="flex justify-end pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddDialogOpen(false)}
                      >
                        Close
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {systems.map((system, index) => {
          const status = statusConfig[system.status];
          const StatusIcon = status.icon;

          return (
            <div
              key={`${system.name}-${index}`}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                status.bgColor,
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {getSystemIcon(system.name)}
                  <StatusIcon className={cn("h-4 w-4", status.color)} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4
                      className="font-medium text-sm text-gray-900 dark:text-white"
                    >
                      {system.name}
                    </h4>
                    <Badge
                      variant="outline"
                      className="text-xs text-gray-700 dark:text-gray-300"
                    >
                      {status.label}
                    </Badge>
                  </div>
                  {system.status === "connected" && (
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      {system.recordCount
                        ? `${system.recordCount.toLocaleString()} records`
                        : ""}
                      {system.lastSync && ` • Last sync: ${system.lastSync}`}
                    </p>
                  )}

                  {system.status === "disconnected" && (
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      System not configured • Click Connect to set up
                    </p>
                  )}

                  {system.status === "error" && (
                    <p className="text-xs text-red-600">
                      Configuration error • Click Fix Error to troubleshoot
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {system.status === "disconnected" && onConfigureSystem && (
                  <Button
                    size="sm"
                    onClick={() => onConfigureSystem(system.name)}
                    disabled={configuringSystem === system.name}
                    className="h-8 px-3 text-xs"
                  >
                    {configuringSystem === system.name ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      "Connect"
                    )}
                  </Button>
                )}

                {system.status === "error" && onConfigureSystem && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onConfigureSystem(system.name)}
                    disabled={configuringSystem === system.name}
                    className="h-8 px-3 text-xs"
                  >
                    {configuringSystem === system.name ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Fixing...
                      </>
                    ) : (
                      "Fix Error"
                    )}
                  </Button>
                )}

                {system.status === "connected" && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setFeaturesDialogSystem(system.name)}
                      className="h-8 px-2"
                      title="View System Features"
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                    {onRemoveSystem && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          showConfirm(
                            `Are you sure you want to remove ${system.name}? This will disconnect the system and remove all its data.`,
                            () => onRemoveSystem(system.name),
                          );
                        }}
                        className="h-8 px-2 hover:bg-red-100 hover:text-red-600"
                        title="Remove System"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {systems.length === 0 && (
          <div className="text-center py-6 text-gray-700 dark:text-gray-300">
            <Settings className="h-8 w-8 mx-auto mb-2 opacity-70" />
            <p className="text-sm">No systems configured</p>
            <p className="text-xs">
              Add integrations to start finding related solutions
            </p>
          </div>
        )}
      </CardContent>

      {/* System Features Dialog */}
      {featuresDialogSystem && (
        <SystemFeaturesDialog
          systemName={featuresDialogSystem}
          isOpen={!!featuresDialogSystem}
          onClose={() => setFeaturesDialogSystem(null)}
        />
      )}
    </Card>
  );
}
