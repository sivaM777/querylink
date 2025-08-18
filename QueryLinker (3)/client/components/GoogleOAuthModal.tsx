import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, User, Check } from "lucide-react";

interface GoogleAccount {
  email: string;
  name: string;
  avatar: string;
}

interface GoogleOAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (account: GoogleAccount) => void;
}

export default function GoogleOAuthModal({
  isOpen,
  onClose,
  onSelect,
}: GoogleOAuthModalProps) {
  const [selectedAccount, setSelectedAccount] = useState<GoogleAccount | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  // Simulated Google accounts (matching your actual accounts from the image)
  const googleAccounts: GoogleAccount[] = [
    {
      email: "sivamariappan1502@gmail.com",
      name: "Siva M",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    },
    {
      email: "sivamariappan152005@gmail.com",
      name: "Siva M",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    },
    {
      email: "sandhiyaesaivani975@gmail.com",
      name: "Sandhiya esaivani",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
    },
    {
      email: "dharunsuba05@gmail.com",
      name: "Dark Gaming",
      avatar:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
    },
    {
      email: "sivamariappan777@gmail.com",
      name: "Siva M",
      avatar:
        "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop&crop=face",
    },
  ];

  const handleContinue = async () => {
    if (!selectedAccount) return;

    setIsLoading(true);
    // Simulate authentication delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    onSelect(selectedAccount);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gray-900 shadow-2xl border border-gray-700 text-white">
        <CardHeader className="text-center pb-6 border-b border-gray-700">
          <div className="flex items-center justify-center mb-6">
            <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <CardTitle className="text-2xl font-normal text-white">
              Sign in with Google
            </CardTitle>
          </div>

          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
              <span className="text-2xl font-bold text-white">Q</span>
            </div>
          </div>

          <h2 className="text-3xl font-light text-white mb-2">
            Choose an account
          </h2>
          <p className="text-lg text-gray-300">to continue to QueryLinker</p>
        </CardHeader>

        <CardContent className="p-0">
          <div className="px-6 py-4">
            <div className="space-y-2">
              {googleAccounts.map((account) => (
                <button
                  key={account.email}
                  onClick={() => setSelectedAccount(account)}
                  className={`w-full p-4 text-left transition-all border-0 ${
                    selectedAccount?.email === account.email
                      ? "bg-gray-700 border-l-4 border-l-blue-500"
                      : "hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={account.avatar}
                      alt={account.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-white">{account.name}</p>
                      <p className="text-sm text-gray-400">{account.email}</p>
                    </div>
                    {selectedAccount?.email === account.email && (
                      <Check className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-700">
            <Button
              onClick={handleContinue}
              disabled={!selectedAccount || isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
