import { createContext, useContext, useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, X } from "lucide-react";

interface AlertOptions {
  title?: string;
  message: string;
  type?: "success" | "warning" | "info" | "error";
  showCancel?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  maxWidth?: string;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  showConfirm: (
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
  ) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider = ({ children }: AlertProviderProps) => {
  const [alertOptions, setAlertOptions] = useState<AlertOptions | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showAlert = (options: AlertOptions) => {
    setAlertOptions(options);
    setIsVisible(true);
  };

  const showConfirm = (
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
  ) => {
    setAlertOptions({
      message,
      type: "warning",
      showCancel: true,
      confirmText: "OK",
      cancelText: "Cancel",
      onConfirm,
      onCancel,
    });
    setIsVisible(true);
  };

  const hideAlert = () => {
    setIsVisible(false);
    setTimeout(() => setAlertOptions(null), 200); // Allow animation to complete
  };

  const handleConfirm = () => {
    if (alertOptions?.onConfirm) {
      alertOptions.onConfirm();
    }
    hideAlert();
  };

  const handleCancel = () => {
    if (alertOptions?.onCancel) {
      alertOptions.onCancel();
    }
    hideAlert();
  };

  const getIcon = () => {
    switch (alertOptions?.type) {
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "warning":
      case "error":
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      default:
        return <CheckCircle className="h-6 w-6 text-blue-500" />;
    }
  };

  const getTitle = () => {
    if (alertOptions?.title) return alertOptions.title;

    switch (alertOptions?.type) {
      case "success":
        return "Success";
      case "warning":
        return "Confirmation Required";
      case "error":
        return "Error";
      default:
        return "Information";
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, hideAlert }}>
      {children}

      {/* Custom Alert Modal */}
      {isVisible && alertOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={alertOptions.showCancel ? handleCancel : undefined}
          />

          {/* Modal Content */}
          <div
            className={`relative z-10 w-full max-w-lg mx-4 transition-all duration-200 transform ${
              isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
          >
            <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getIcon()}
                    <CardTitle className="text-lg font-semibold">
                      {getTitle()}
                    </CardTitle>
                  </div>
                  {alertOptions.showCancel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancel}
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div
                  className="text-black leading-relaxed whitespace-pre-line"
                  style={{ color: "#000000" }}
                >
                  {alertOptions.message}
                </div>

                <div className="flex justify-end gap-3">
                  {alertOptions.showCancel && (
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      className="min-w-[80px]"
                    >
                      {alertOptions.cancelText || "Cancel"}
                    </Button>
                  )}
                  <Button
                    onClick={handleConfirm}
                    className="min-w-[80px]"
                    variant={
                      alertOptions.type === "error" ? "destructive" : "default"
                    }
                  >
                    {alertOptions.confirmText || "OK"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};
