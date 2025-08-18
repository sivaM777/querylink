import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import UserProfile from "@/components/UserProfile";
import { useNotifications } from "@/hooks/use-notifications";
import { useTheme } from "@/components/providers/ThemeProvider";
import {
  ArrowLeft,
  Brain,
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Globe,
  Mail,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Volume2,
  Eye,
  Lock,
  Key,
  Save,
  RefreshCw,
  Download,
  Trash2,
} from "lucide-react";

interface SettingsData {
  // Appearance
  theme: string;
  darkMode: boolean;
  fontSize: string;

  // Notifications
  emailNotifications: boolean;
  pushNotifications: boolean;
  desktopNotifications: boolean;
  soundEnabled: boolean;

  // Privacy & Security
  twoFactorEnabled: boolean;
  dataCollection: boolean;
  analyticsTracking: boolean;

  // Application
  autoRefresh: boolean;
  refreshInterval: string;
  language: string;
  timezone: string;

  // Dashboard
  defaultView: string;
  showQuickActions: boolean;
  showRecentActivity: boolean;
}

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme, actualTheme } = useTheme();

  // Apply theme settings
  const applyThemeSettings = () => {
    // Theme is now handled by ThemeProvider
    // This function is kept for compatibility but uses the new theme system
    setTheme(settings.theme as "light" | "dark" | "system");
  };

  // Apply font size settings
  const applyFontSizeSettings = (fontSize: string = settings.fontSize) => {
    const root = document.documentElement;

    // Remove existing font size classes
    root.classList.remove("text-sm", "text-base", "text-lg");

    switch (fontSize) {
      case "small":
        root.classList.add("text-sm");
        break;
      case "large":
        root.classList.add("text-lg");
        break;
      default:
        root.classList.add("text-base");
        break;
    }
  };

  // Apply auto refresh settings
  const applyAutoRefreshSettings = () => {
    if (typeof window !== "undefined" && window.queryLinkerAutoRefresh) {
      clearInterval(window.queryLinkerAutoRefresh);
    }

    if (settings.autoRefresh && settings.refreshInterval) {
      const interval = parseInt(settings.refreshInterval) * 1000;
      if (typeof window !== "undefined") {
        window.queryLinkerAutoRefresh = setInterval(() => {
          // Trigger a custom event for auto refresh
          window.dispatchEvent(new CustomEvent('querylinker-auto-refresh'));
        }, interval);
      }
    }
  };

  // Handle Change Password
  const handleChangePassword = () => {
    navigate("/forgot-password");
  };

  // Handle Enable Two-Factor Authentication
  const handleEnableTwoFactor = async () => {
    if (!settings.twoFactorEnabled) {
      // Simulate 2FA setup process
      setSuccess("Two-Factor Authentication setup initiated. Please check your email for setup instructions.");
      setTimeout(() => setSuccess(""), 5000);
    } else {
      setSettings(prev => ({ ...prev, twoFactorEnabled: false }));
      setSuccess("Two-Factor Authentication has been disabled.");
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  // Handle Language Change
  const handleLanguageChange = (language: string) => {
    setSettings(prev => ({ ...prev, language }));
    // In a real app, you would load language resources here
    console.log(`Language changed to: ${language}`);
  };

  // Handle notification settings
  const handleDesktopNotificationChange = async (checked: boolean) => {
    if (checked && notificationPermission !== 'granted') {
      const permission = await requestNotificationPermission();
      if (permission !== 'granted') {
        setError('Desktop notifications permission denied. Please enable notifications in your browser settings.');
        setTimeout(() => setError(''), 5000);
        return;
      }
    }

    setSettings(prev => ({ ...prev, desktopNotifications: checked }));

    if (checked) {
      sendTestNotification('QueryLinker Notifications', 'Desktop notifications are now enabled!');
    }
  };

  const handleSoundEnabledChange = (checked: boolean) => {
    setSettings(prev => ({ ...prev, soundEnabled: checked }));

    if (checked) {
      playNotificationSound();
    }
  };
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<SettingsData>({
    // Appearance
    theme: theme,
    darkMode: actualTheme === "dark",
    fontSize: "medium",

    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    desktopNotifications: false,
    soundEnabled: true,

    // Privacy & Security
    twoFactorEnabled: false,
    dataCollection: true,
    analyticsTracking: true,

    // Application
    autoRefresh: true,
    refreshInterval: "30",
    language: "en",
    timezone: "UTC",

    // Dashboard
    defaultView: "dashboard",
    showQuickActions: true,
    showRecentActivity: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  // Notification hook
  const {
    notificationPermission,
    requestNotificationPermission,
    sendTestNotification,
    playNotificationSound,
    isNotificationSupported
  } = useNotifications(settings);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      // Load user preferences if available
      const savedSettings = localStorage.getItem("userSettings");
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          setSettings((prev) => ({ ...prev, ...parsedSettings }));
        } catch (error) {
          console.warn("Failed to parse saved settings:", error);
        }
      } else if (parsedUser.preferences) {
        setSettings((prev) => ({ ...prev, ...parsedUser.preferences }));
      }
    } else {
      navigate("/login");
    }

    // Sync settings with current theme
    setSettings((prev) => ({
      ...prev,
      theme: theme,
      darkMode: actualTheme === "dark"
    }));

    // Apply current settings on page load
    setTimeout(() => {
      applyThemeSettings();
      applyFontSizeSettings();
      applyAutoRefreshSettings();
    }, 100);
  }, [navigate]);

  // Clean up auto refresh interval on component unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.queryLinkerAutoRefresh) {
        clearInterval(window.queryLinkerAutoRefresh);
      }
    };
  }, []);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Save to localStorage first for immediate UI response
      localStorage.setItem("userSettings", JSON.stringify(settings));

  // Apply theme changes immediately using new theme system
  setTheme(settings.theme as "light" | "dark" | "system");
  applyFontSizeSettings();
  applyAutoRefreshSettings();

      // Update user preferences in database
      if (user) {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/auth/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-User-ID": user.id.toString(),
          },
          body: JSON.stringify({
            preferences: settings,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data?.success) {
          // Update local user data
          const updatedUser = { ...user, preferences: settings };
          setUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setSuccess("Settings saved successfully!");
        } else {
          throw new Error(data?.message || "Failed to save settings to server");
        }
      } else {
        setSuccess("Settings saved locally!");
      }

      setTimeout(() => setSuccess(""), 5000);
    } catch (error) {
      console.error("Settings save error:", error);
      setError(error instanceof Error ? error.message : "Failed to save settings. Please try again.");
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSettings = () => {
    const defaultSettings: SettingsData = {
      theme: "system",
      darkMode: false,
      fontSize: "medium",
      emailNotifications: true,
      pushNotifications: true,
      desktopNotifications: false,
      soundEnabled: true,
      twoFactorEnabled: false,
      dataCollection: true,
      analyticsTracking: true,
      autoRefresh: true,
      refreshInterval: "30",
      language: "en",
      timezone: "UTC",
      defaultView: "dashboard",
      showQuickActions: true,
      showRecentActivity: true,
    };

    setSettings(defaultSettings);

    // Apply default settings immediately
    localStorage.setItem("userSettings", JSON.stringify(defaultSettings));

  // Apply theme reset using new theme system
  setTheme("system");
  applyFontSizeSettings("medium");

    setSuccess("Settings reset to defaults! Click 'Save Settings' to apply permanently.");
    setTimeout(() => setSuccess(""), 5000);
  };

  const handleDeleteAccount = async () => {
    if (!user || !deletePassword.trim()) {
      setError("Password is required to delete account");
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-User-ID": user.id.toString(),
        },
        body: JSON.stringify({
          password: deletePassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Clear all local storage
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userSettings");

        // Show success message and redirect
        alert("Account deleted successfully. You will be redirected to the login page.");
        navigate("/login");
      } else {
        setError(data.message || "Failed to delete account");
      }
    } catch (error) {
      console.error("Delete account error:", error);
      setError("Network error. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setDeletePassword("");
    }
  };

  const handleDownloadData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-User-ID": user.id.toString(),
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userData = {
          user: data.user,
          settings: settings,
          exportDate: new Date().toISOString(),
          version: "2.1.0"
        };

        const blob = new Blob([JSON.stringify(userData, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `querylinker-data-${user.email}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setSuccess("Account data downloaded successfully!");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (error) {
      console.error("Download data error:", error);
      setError("Failed to download account data");
    }
  };

  // Export settings only
  const handleExportSettings = () => {
    const settingsData = {
      settings: settings,
      exportDate: new Date().toISOString(),
      version: "2.1.0",
      user: user.email
    };

    const blob = new Blob([JSON.stringify(settingsData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `querylinker-settings-${user.email}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSuccess("Settings exported successfully!");
    setTimeout(() => setSuccess(""), 3000);
  };

  // Import settings
  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);

        if (importedData.settings) {
          setSettings(importedData.settings);
          setSuccess("Settings imported successfully! Don't forget to save them.");
          setTimeout(() => setSuccess(""), 5000);
        } else {
          setError("Invalid settings file format.");
          setTimeout(() => setError(""), 3000);
        }
      } catch (error) {
        setError("Failed to import settings. Please check the file format.");
        setTimeout(() => setError(""), 3000);
      }
    };
    reader.readAsText(file);

    // Reset the input value so the same file can be selected again
    event.target.value = '';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Responsive */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-ql-gradient rounded-lg flex items-center justify-center">
                <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold bg-ql-gradient bg-clip-text text-transparent">
                  QueryLinker
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  AI-Powered ITSM Assistant
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button asChild variant="outline" size="sm" className="hidden sm:flex">
                <Link to="/analytics">Analytics</Link>
              </Button>
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/20"
              >
                v2.1.0
              </Badge>
              <UserProfile />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Page Header - Mobile optimized */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button asChild variant="outline" size="sm">
            <Link to="/" className="flex items-center gap-1 sm:gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Customize your QueryLinker experience
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm animate-in slide-in-from-top-2 duration-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm animate-in slide-in-from-top-2 duration-300">
            {success}
          </div>
        )}

        <Tabs defaultValue="appearance" className="space-y-4 sm:space-y-6">
          {/* Mobile: Scrollable horizontal tabs, Desktop: Grid layout */}
          <div className="overflow-x-auto sm:overflow-visible">
            <TabsList className="flex sm:grid w-max sm:w-full grid-cols-1 sm:grid-cols-5 gap-1 sm:gap-0 p-1">
              <TabsTrigger value="appearance" className="flex-shrink-0 text-xs sm:text-sm px-2 sm:px-4 py-2">
                <Palette className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Appearance</span>
                <span className="sm:hidden">Theme</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex-shrink-0 text-xs sm:text-sm px-2 sm:px-4 py-2">
                <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Notifications</span>
                <span className="sm:hidden">Alerts</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex-shrink-0 text-xs sm:text-sm px-2 sm:px-4 py-2">
                <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Privacy</span>
                <span className="sm:hidden">Security</span>
              </TabsTrigger>
              <TabsTrigger value="application" className="flex-shrink-0 text-xs sm:text-sm px-2 sm:px-4 py-2">
                <Monitor className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Application</span>
                <span className="sm:hidden">App</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="flex-shrink-0 text-xs sm:text-sm px-2 sm:px-4 py-2">
                <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Account</span>
                <span className="sm:hidden">Profile</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance Preferences</CardTitle>
                <CardDescription>
                  Customize the look and feel of QueryLinker
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    {actualTheme === "dark" ? (
                      <Moon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    ) : (
                      <Sun className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base">Dark Mode</p>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">
                        Force dark theme (overrides theme setting)
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <Switch
                      checked={theme === "dark"}
                      onCheckedChange={(checked) => {
                        const newTheme = checked ? "dark" : "light";
                        setTheme(newTheme);
                        setSettings((prev) => ({
                          ...prev,
                          theme: newTheme,
                          darkMode: checked
                        }));
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Theme</label>
                  <Select
                    value={theme}
                    onValueChange={(value: "light" | "dark" | "system") => {
                      setTheme(value);
                      setSettings((prev) => ({
                        ...prev,
                        theme: value,
                        darkMode: value === "dark" || (value === "system" && actualTheme === "dark")
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Current: {theme === "system" ? `System (${actualTheme})` : theme}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Font Size</label>
                  <Select
                    value={settings.fontSize}
                    onValueChange={(value) => {
                      setSettings((prev) => ({ ...prev, fontSize: value }));
                      // Apply font size immediately
                      setTimeout(() => applyFontSizeSettings(value), 100);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Control how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        emailNotifications: checked,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive push notifications on mobile devices
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        pushNotifications: checked,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Desktop Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Show browser notifications on desktop
                        {!isNotificationSupported && " (Not supported in this browser)"}
                        {isNotificationSupported && notificationPermission === 'denied' && " (Permission denied)"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.desktopNotifications && isNotificationSupported && notificationPermission === 'granted'}
                    onCheckedChange={handleDesktopNotificationChange}
                    disabled={!isNotificationSupported || notificationPermission === 'denied'}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Sound</p>
                      <p className="text-sm text-muted-foreground">
                        Play notification sounds
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.soundEnabled}
                    onCheckedChange={handleSoundEnabledChange}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy & Security Settings */}
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Security</CardTitle>
                <CardDescription>
                  Manage your privacy and security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.twoFactorEnabled}
                    onCheckedChange={(checked) => {
                      setSettings((prev) => ({
                        ...prev,
                        twoFactorEnabled: checked,
                      }));
                      if (checked) {
                        handleEnableTwoFactor();
                      }
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Data Collection</p>
                      <p className="text-sm text-muted-foreground">
                        Allow collection of usage data to improve the service
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.dataCollection}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        dataCollection: checked,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Eye className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Analytics Tracking</p>
                      <p className="text-sm text-muted-foreground">
                        Help us understand how you use QueryLinker
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.analyticsTracking}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        analyticsTracking: checked,
                      }))
                    }
                  />
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-4">Security Actions</h4>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={handleChangePassword}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={handleDownloadData}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Account Data
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={handleExportSettings}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Settings
                    </Button>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportSettings}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        id="settings-import"
                      />
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        asChild
                      >
                        <label htmlFor="settings-import" className="cursor-pointer">
                          <Download className="h-4 w-4 mr-2 rotate-180" />
                          Import Settings
                        </label>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Application Settings */}
          <TabsContent value="application">
            <Card>
              <CardHeader>
                <CardTitle>Application Settings</CardTitle>
                <CardDescription>
                  Configure how QueryLinker behaves
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Auto Refresh</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically refresh data
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.autoRefresh}
                    onCheckedChange={(checked) => {
                      setSettings((prev) => ({ ...prev, autoRefresh: checked }));
                      // Apply auto refresh settings immediately
                      setTimeout(() => applyAutoRefreshSettings(), 100);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Refresh Interval (seconds)
                  </label>
                  <Select
                    value={settings.refreshInterval}
                    onValueChange={(value) => {
                      setSettings((prev) => ({
                        ...prev,
                        refreshInterval: value,
                      }));
                      // Apply new refresh interval immediately if auto refresh is enabled
                      if (settings.autoRefresh) {
                        setTimeout(() => applyAutoRefreshSettings(), 100);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Language</label>
                  <Select
                    value={settings.language}
                    onValueChange={handleLanguageChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Default Dashboard View
                  </label>
                  <Select
                    value={settings.defaultView}
                    onValueChange={(value) =>
                      setSettings((prev) => ({ ...prev, defaultView: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dashboard">Dashboard</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                      <SelectItem value="knowledge-base">
                        Knowledge Base
                      </SelectItem>
                      <SelectItem value="sla-management">
                        SLA Management
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Settings */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  View and manage your account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input value={user.email} disabled className="bg-muted" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Role</label>
                    <Input value={user.role} disabled className="bg-muted" />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-4 text-red-600">Danger Zone</h4>
                  <div className="space-y-3">
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Settings Preview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Settings Summary</CardTitle>
            <CardDescription>
              Current configuration overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                {/* Theme summary removed */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Font Size:</span>
                  <span className="font-medium capitalize">{settings.fontSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Language:</span>
                  <span className="font-medium">{settings.language === 'en' ? 'English' : settings.language.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auto Refresh:</span>
                  <span className="font-medium">{settings.autoRefresh ? `${settings.refreshInterval}s` : 'Disabled'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email Notifications:</span>
                  <span className="font-medium">{settings.emailNotifications ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Desktop Notifications:</span>
                  <span className="font-medium">{settings.desktopNotifications && isNotificationSupported ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Two-Factor Auth:</span>
                  <span className="font-medium">{settings.twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Default View:</span>
                  <span className="font-medium capitalize">{settings.defaultView.replace('-', ' ')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <Button
            onClick={handleSaveSettings}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
          <Button
            onClick={handleResetSettings}
            variant="outline"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove all your data from our servers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Enter your password to confirm
              </label>
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeletePassword("");
                setError("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting || !deletePassword.trim()}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
