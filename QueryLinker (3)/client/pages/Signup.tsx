import { useState } from "react";
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
import { Eye, EyeOff, Brain, Mail, Lock, User } from "lucide-react";
import GoogleOAuthModal from "@/components/GoogleOAuthModal";

interface SignupData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export default function Signup() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupData, setSignupData] = useState<SignupData>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !signupData.fullName ||
      !signupData.email ||
      !signupData.password ||
      !signupData.confirmPassword
    ) {
      setError("Please fill in all fields");
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (signupData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (!signupData.agreeToTerms) {
      setError("Please agree to the terms and conditions");
      return;
    }

    setIsLoading(true);
    setError(""); // Clear any previous errors

    let response;
    let responseText = "";
    let result = null;

    try {
      // Make the API call
      response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: signupData.fullName,
          email: signupData.email,
          password: signupData.password,
        }),
      });
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      setError("Network error. Please check your connection and try again.");
      setIsLoading(false);
      return;
    }

    if (!response.body) {
      setError("No response from server. Please try again.");
      setIsLoading(false);
      return;
    }

    try {
      // Read response text
      responseText = await response.text();
      console.log("Raw response:", responseText);
    } catch (textError) {
      console.error("Failed to read response:", textError);
      setError("Failed to read server response. Please try again.");
      setIsLoading(false);
      return;
    }

    try {
      // Parse JSON
      result = JSON.parse(responseText);
    } catch (jsonError) {
      console.error("JSON parsing failed:", jsonError);
      console.error("Raw response text:", responseText);
      setError("Server returned invalid response. Please try again.");
      setIsLoading(false);
      return;
    }

    console.log("Signup response details:", {
      status: response.status,
      ok: response.ok,
      result: result,
      message: result?.message,
    });

    // Handle successful response
    if (response.ok && result?.success) {
      setError("");
      alert(
        "Account created successfully! Please sign in with your credentials.",
      );
      navigate("/login");
      setIsLoading(false);
      return;
    }

    // Handle 400 errors (like user already exists)
    if (response.status === 400) {
      if (result?.message?.includes("already exists")) {
        setError(
          "User already exists. Please enter new details or sign in instead.",
        );
      } else if (result?.message?.includes("required")) {
        setError("All fields are required. Please fill in all information.");
      } else if (result?.message?.includes("6 characters")) {
        setError("Password must be at least 6 characters long.");
      } else if (result?.message) {
        setError(result.message);
      } else {
        setError(
          "Registration failed. Please check your information and try again.",
        );
      }
    } else {
      // Handle other error responses
      setError(
        result?.message ||
          `Registration failed (${response.status}). Please try again.`,
      );
    }

    setIsLoading(false);
  };

  const handleGoogleSignup = () => {
    setShowGoogleModal(true);
  };

  const handleGoogleAccountSelect = async (account: any) => {
    try {
      setError("");
      setShowGoogleModal(false);

      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: "demo_google_token",
          email: account.email,
          name: account.name,
          picture: account.avatar,
        }),
      });

      if (!response.body) {
        setError("No response from server. Please try again.");
        return;
      }

      // Safely read response only once
      let responseText = "";
      let data = null;

      try {
        responseText = await response.text();
      } catch (textError) {
        console.error("Failed to read response:", textError);
        setError("Network error. Please try again.");
        return;
      }

      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error("Invalid JSON response:", responseText);
        setError("Server error. Please try again.");
        return;
      }

      if (response.ok && data?.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        navigate("/");
      } else {
        setError(data?.message || "Google signup failed");
      }
    } catch (error) {
      console.error("Google signup error:", error);
      setError("Google signup failed. Please try again.");
    }
  };

  const handleAppleSignup = async () => {
    try {
      setError("");
      const response = await fetch("/api/auth/apple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identityToken: "demo_apple_token",
          user: {
            email: "user@icloud.com",
            name: { firstName: "Apple", lastName: "User" },
          },
        }),
      });

      if (!response.body) {
        setError("No response from server. Please try again.");
        return;
      }

      // Safely read response only once
      let responseText = "";
      let data = null;

      try {
        responseText = await response.text();
      } catch (textError) {
        console.error("Failed to read response:", textError);
        setError("Network error. Please try again.");
        return;
      }

      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error("Invalid JSON response:", responseText);
        setError("Server error. Please try again.");
        return;
      }

      if (response.ok && data?.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        navigate("/");
      } else {
        setError(data?.message || "Apple signup failed");
      }
    } catch (error) {
      console.error("Apple signup error:", error);
      setError("Apple signup failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Brain className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white mb-2">
            QueryLinker
          </CardTitle>
          <CardDescription className="text-gray-300">
            AI-Powered ITSM Assistant
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-white">
              Sign Up To Your Account
            </h3>
            <p className="text-sm text-gray-400">
              Access your account to manage settings, explore features
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
              {(error.includes("already exists") ||
                error.includes("User already exists")) && (
                <div className="mt-2">
                  <Link
                    to="/login"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Go to Sign In →
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Anna Brown"
                  value={signupData.fullName}
                  onChange={(e) =>
                    setSignupData({ ...signupData, fullName: e.target.value })
                  }
                  className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="anna.brown@example.com"
                  value={signupData.email}
                  onChange={(e) =>
                    setSignupData({ ...signupData, email: e.target.value })
                  }
                  className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={signupData.password}
                  onChange={(e) =>
                    setSignupData({ ...signupData, password: e.target.value })
                  }
                  className="pl-10 pr-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={signupData.confirmPassword}
                  onChange={(e) =>
                    setSignupData({
                      ...signupData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="pl-10 pr-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={signupData.agreeToTerms}
                onChange={(e) =>
                  setSignupData({
                    ...signupData,
                    agreeToTerms: e.target.checked,
                  })
                }
                className="rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
              />
              <label className="text-sm text-gray-300">
                I agree to the{" "}
                <Link
                  to="/terms"
                  className="text-purple-400 hover:text-purple-300"
                >
                  Terms and Conditions
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 rounded-lg"
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Register"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-gray-900 text-gray-400">Or</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              onClick={handleGoogleSignup}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 py-3"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
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
              Sign up with Google
            </Button>

            <Button
              type="button"
              onClick={handleAppleSignup}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 py-3"
            >
              <svg
                className="w-5 h-5 mr-3"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12.017 21.906c-2.124 0-4.066-.936-5.472-2.636C4.893 17.12 4 14.782 4 12.288c0-3.24 1.35-6.062 3.515-7.344a6.5 6.5 0 011.452-.642c.436-.12.9-.18 1.378-.18 1.034 0 2.016.281 2.84.813.82.532 1.458 1.281 1.844 2.168.07.156.103.323.103.491 0 .402-.217.773-.563.965-.346.192-.78.162-1.095-.076a3.09 3.09 0 00-.726-.414 2.636 2.636 0 00-.87-.148c-.412 0-.81.098-1.162.285-.671.358-1.162 1.072-1.348 1.963-.071.337-.108.687-.108 1.041 0 1.456.505 2.823 1.423 3.852.46.515 1.017.923 1.654 1.213.637.29 1.339.44 2.087.44.748 0 1.45-.15 2.087-.44.637-.29 1.194-.698 1.654-1.213.918-1.029 1.423-2.396 1.423-3.852 0-.354-.037-.704-.108-1.041-.186-.891-.677-1.605-1.348-1.963a2.636 2.636 0 00-1.162-.285c-.299 0-.588.05-.87.148-.282.098-.535.235-.726.414-.315.238-.749.268-1.095.076-.346-.192-.563-.563-.563-.965 0-.168.033-.335.103-.491.386-.887 1.024-1.636 1.844-2.168.824-.532 1.806-.813 2.84-.813.478 0 .942.06 1.378.18.516.142.994.363 1.452.642C19.65 6.226 21 9.048 21 12.288c0 2.494-.893 4.832-2.545 6.982-1.406 1.7-3.348 2.636-5.472 2.636h.034z" />
              </svg>
              Continue with Apple
            </Button>
          </div>

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-purple-400 hover:text-purple-300 font-medium"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Google OAuth Modal */}
      <GoogleOAuthModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSelect={handleGoogleAccountSelect}
      />
    </div>
  );
}
