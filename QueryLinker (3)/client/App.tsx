import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AlertProvider } from "./components/CustomAlert";
import { ThemeProvider } from "./components/providers/ThemeProvider";
import Index from "./pages/Index";
import Analytics from "./pages/Analytics";
import SLAManagement from "./pages/SLAManagement";
import KnowledgeBase from "./pages/KnowledgeBase";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import OAuthCallback from "./pages/OAuthCallback";
import SolutionDetails from "./pages/SolutionDetails";
import NotFound from "./pages/NotFound";

const ProtectedRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
    const token = localStorage.getItem("token");
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

const App = () => {
    return (
        <ThemeProvider defaultTheme="light" storageKey="querylinker-theme">
            <AlertProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                        <Route path="/sla-management" element={<ProtectedRoute><SLAManagement /></ProtectedRoute>} />
                        <Route path="/knowledge-base" element={<ProtectedRoute><KnowledgeBase /></ProtectedRoute>} />
                        <Route path="/knowledge-base/:articleId" element={<ProtectedRoute><SolutionDetails /></ProtectedRoute>} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                        <Route path="/oauth/callback" element={<OAuthCallback />} />
                        <Route path="/solution/:solutionId" element={<ProtectedRoute><SolutionDetails /></ProtectedRoute>} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </BrowserRouter>
            </AlertProvider>
        </ThemeProvider>
    );
};

export default App;
