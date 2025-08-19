import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  const isHelpRequest = location.pathname === "/help";

  console.log(
    "NotFound: pathname =",
    location.pathname,
    "isHelpRequest =",
    isHelpRequest,
  );

  if (isHelpRequest) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "32px",
          backgroundColor: "white",
          color: "black",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              marginBottom: "32px",
              color: "black",
            }}
          >
            QueryLinker Help & Documentation
          </h1>

          <div style={{ marginBottom: "32px" }}>
            <h2
              style={{
                fontSize: "24px",
                fontWeight: "600",
                marginBottom: "16px",
                color: "black",
              }}
            >
              Getting Started
            </h2>
            <p
              style={{ marginBottom: "16px", color: "#666", lineHeight: "1.6" }}
            >
              Welcome to QueryLinker - your AI-powered ITSM assistant that helps
              you find related solutions instantly.
            </p>

            <h3
              style={{
                fontSize: "18px",
                fontWeight: "500",
                marginBottom: "8px",
                color: "black",
              }}
            >
              How to Search
            </h3>
            <ul
              style={{
                marginLeft: "20px",
                marginBottom: "16px",
                color: "#666",
              }}
            >
              <li>Enter incident numbers (e.g., INC0123456)</li>
              <li>Describe issues in plain English</li>
              <li>Use relevant technical keywords</li>
            </ul>

            <h3
              style={{
                fontSize: "18px",
                fontWeight: "500",
                marginBottom: "8px",
                color: "black",
              }}
            >
              Connected Systems
            </h3>
            <p style={{ color: "#666", lineHeight: "1.6" }}>
              QueryLinker searches across Jira Cloud, Confluence, GitHub, and
              ServiceNow KB.
            </p>
          </div>

          <div>
            <h2
              style={{
                fontSize: "24px",
                fontWeight: "600",
                marginBottom: "16px",
                color: "black",
              }}
            >
              Quick Links
            </h2>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <a
                href="/analytics"
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                Analytics
              </a>
              <a
                href="/knowledge-base"
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  backgroundColor: "#6b7280",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                Knowledge Base
              </a>
              <a
                href="/"
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  backgroundColor: "#f3f4f6",
                  color: "black",
                  textDecoration: "none",
                  borderRadius: "4px",
                  fontSize: "14px",
                  border: "1px solid #d1d5db",
                }}
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
