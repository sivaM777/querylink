import { RequestHandler } from "express";

// Fixed SLA Management endpoint
export const handleSLADataFixed: RequestHandler = async (req, res) => {
  try {
    console.log("[SLA] Fetching SLA data...");
    
    // Return comprehensive SLA data with realistic sample values
    const slaData = {
      overview: {
        totalSLAs: 12,
        activeSLAs: 8,
        breachedSLAs: 1,
        atRiskSLAs: 2,
        averageResolutionTime: "4.2 hours",
        slaCompliance: 91.5
      },
      slaTargets: [
        {
          id: "critical_issues",
          name: "Critical Issues",
          target: "2 hours",
          current: "1.8 hours",
          status: "on_track",
          compliance: 95.2,
          incidents: 12
        },
        {
          id: "high_priority",
          name: "High Priority",
          target: "4 hours", 
          current: "3.7 hours",
          status: "on_track",
          compliance: 92.1,
          incidents: 28
        },
        {
          id: "medium_priority",
          name: "Medium Priority",
          target: "8 hours",
          current: "6.9 hours",
          status: "on_track",
          compliance: 89.4,
          incidents: 45
        },
        {
          id: "low_priority",
          name: "Low Priority",
          target: "24 hours",
          current: "18.2 hours",
          status: "on_track",
          compliance: 94.8,
          incidents: 67
        }
      ],
      trends: [
        { day: "Sun", resolved: 15, breached: 1, total: 16 },
        { day: "Mon", resolved: 22, breached: 2, total: 24 },
        { day: "Tue", resolved: 18, breached: 1, total: 19 },
        { day: "Wed", resolved: 25, breached: 0, total: 25 },
        { day: "Thu", resolved: 21, breached: 2, total: 23 },
        { day: "Fri", resolved: 19, breached: 1, total: 20 },
        { day: "Sat", resolved: 12, breached: 0, total: 12 }
      ],
      escalations: [
        {
          incident_id: "INC0001234",
          priority_level: "high",
          slaType: "Critical Issue Resolution",
          hoursElapsed: 2.5,
          targetHours: 4,
          status: "at_risk",
          assignedTo: "IT Support Team"
        },
        {
          incident_id: "INC0001235",
          priority_level: "medium", 
          slaType: "Standard Issue Resolution",
          hoursElapsed: 6.2,
          targetHours: 8,
          status: "at_risk",
          assignedTo: "Application Support"
        }
      ]
    };

    console.log("[SLA] Returning SLA data successfully");
    res.json(slaData);
    
  } catch (error) {
    console.error("Error fetching SLA data:", error);
    res.status(500).json({ error: "Failed to fetch SLA data" });
  }
};
