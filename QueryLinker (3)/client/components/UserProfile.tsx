import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, getAuthHeaders } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "@/components/providers/ThemeProvider";
import {
  User,
  Settings,
  LogOut,
  Bell,
  Shield,
  HelpCircle,
  Moon,
  Sun,
  ChevronDown,
  UserCheck,
  CreditCard,
  Activity,
} from "lucide-react";

interface UserData {
  id: number;
  email: string;
  fullName: string;
  role: string;
  avatarUrl?: string;
  preferences?: any;
}

interface Notification {
  notification_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export default function UserProfile() {
  const navigate = useNavigate();
  const { theme, actualTheme } = useTheme();
  const [user, setUser] = useState<UserData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get user from localStorage or fetch from API
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
      fetchNotifications();
    }

    // Theme is now handled by ThemeProvider

    // Handle click outside to close dropdowns
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-User-ID": user?.id.toString() || "",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", {
        method: "POST",
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Theme toggle functionality is handled by ThemeProvider

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`/api/auth/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-User-ID": user?.id.toString() || "",
        },
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.notification_id === notificationId
            ? { ...notif, is_read: true }
            : notif,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const diff = Math.floor(
      (new Date().getTime() - new Date(dateString).getTime()) / 60000,
    );
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      case "info":
      default:
        return "ℹ️";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/login">
          <Button variant="outline" size="sm">
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Notifications */}
      <div className="relative" ref={notificationRef}>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          onClick={() => {
            setShowNotifications(!showNotifications);
            setShowDropdown(false);
          }}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center bg-red-500">
              {unreadCount}
            </Badge>
          )}
        </Button>

        {showNotifications && (
          <Card className="absolute right-0 top-full mt-2 w-80 z-50 shadow-lg border">
            <CardContent className="p-0">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {unreadCount} unread
                  </p>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.slice(0, 5).map((notif) => (
                    <div
                      key={notif.notification_id}
                      className={`p-4 border-b cursor-pointer hover:bg-muted/50 ${
                        !notif.is_read ? "bg-blue-50 dark:bg-blue-950/20" : ""
                      }`}
                      onClick={() => {
                        if (!notif.is_read) {
                          markNotificationAsRead(notif.notification_id);
                        }
                        if (notif.action_url) {
                          navigate(notif.action_url);
                        }
                        setShowNotifications(false);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg">
                          {getNotificationIcon(notif.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {notif.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getTimeAgo(notif.created_at)}
                          </p>
                        </div>
                        {!notif.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                  </div>
                )}
              </div>

              {notifications.length > 5 && (
                <div className="p-4 border-t">
                  <Button variant="ghost" size="sm" className="w-full">
                    View all notifications
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* User Profile */}
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="ghost"
          className="flex items-center gap-2 p-2"
          onClick={() => {
            setShowDropdown(!showDropdown);
            setShowNotifications(false);
          }}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(user.fullName)
            )}
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>

        {showDropdown && (
          <Card className="absolute right-0 top-full mt-2 w-64 z-50 shadow-lg border">
            <CardContent className="p-0">
              {/* User Info */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(user.fullName)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{user.fullName}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {user.role}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <Link to="/profile" onClick={() => setShowDropdown(false)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 h-9"
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </Button>
                </Link>

                <Link to="/settings" onClick={() => setShowDropdown(false)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 h-9"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-9"
                  onClick={() => {
                    setShowDropdown(false);
                    navigate("/analytics");
                  }}
                >
                  <Activity className="h-4 w-4" />
                  My Activity
                </Button>

                {/* Theme toggle removed from user profile dropdown */}

                <Link to="/help" onClick={() => setShowDropdown(false)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 h-9"
                  >
                    <HelpCircle className="h-4 w-4" />
                    Help & Support
                  </Button>
                </Link>

                <div className="border-t my-2"></div>

                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setShowDropdown(false);
                    handleLogout();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
