const Incident = require('../models/Incident');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get analytics summary
// @route   GET /api/analytics/summary
// @access  Public
exports.getAnalyticsSummary = asyncHandler(async (req, res, next) => {
  const incidents = await Incident.find().lean();
  
  // 1. Severity Distribution
  const severityMap = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  incidents.forEach(inc => {
    if (severityMap[inc.severity] !== undefined) {
      severityMap[inc.severity]++;
    }
  });
  
  const severityDistribution = [
    { name: "Critical", value: severityMap.Critical, color: "#EF4444" },
    { name: "High", value: severityMap.High, color: "#F97316" },
    { name: "Medium", value: severityMap.Medium, color: "#FBBF24" },
    { name: "Low", value: severityMap.Low, color: "#3B82F6" }
  ];

  // 2. Category Breakdown
  const categoryMap = {};
  incidents.forEach(inc => {
    categoryMap[inc.category] = (categoryMap[inc.category] || 0) + 1;
  });
  
  const categoryBreakdown = Object.keys(categoryMap).map(key => ({
    name: key,
    count: categoryMap[key]
  })).sort((a, b) => b.count - a.count).slice(0, 5); // top 5

  // 3. Simple Trend Data (last 7 days by day name)
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const trendMap = {};
  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trendMap[days[d.getDay()]] = { day: days[d.getDay()], count: 0, target: 10 };
  }
  
  incidents.forEach(inc => {
    const incDate = new Date(inc.createdAt);
    // Check if within last 7 days
    const diffTime = Math.abs(new Date() - incDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays <= 7) {
      const dayName = days[incDate.getDay()];
      if (trendMap[dayName]) {
         trendMap[dayName].count++;
      }
    }
  });
  
  const trendData = Object.values(trendMap);

  // 4. Time Trend (For Dashboard) 24h
  const timeTrendMap = {
    "00:00": { critical: 0, high: 0, medium: 0, low: 0 },
    "04:00": { critical: 0, high: 0, medium: 0, low: 0 },
    "08:00": { critical: 0, high: 0, medium: 0, low: 0 },
    "12:00": { critical: 0, high: 0, medium: 0, low: 0 },
    "16:00": { critical: 0, high: 0, medium: 0, low: 0 },
    "20:00": { critical: 0, high: 0, medium: 0, low: 0 }
  };
  
  incidents.forEach(inc => {
    const incDate = new Date(inc.createdAt);
    const diffHours = Math.abs(new Date() - incDate) / 36e5;
    if (diffHours <= 24) {
      const hour = incDate.getHours();
      let slot = "00:00";
      if (hour >= 4 && hour < 8) slot = "04:00";
      else if (hour >= 8 && hour < 12) slot = "08:00";
      else if (hour >= 12 && hour < 16) slot = "12:00";
      else if (hour >= 16 && hour < 20) slot = "16:00";
      else if (hour >= 20) slot = "20:00";
      
      const sev = inc.severity.toLowerCase();
      if (timeTrendMap[slot][sev] !== undefined) {
        timeTrendMap[slot][sev]++;
      }
    }
  });
  
  const timeTrendData = Object.keys(timeTrendMap).map(key => ({
    time: key,
    ...timeTrendMap[key]
  }));

  // 5. Recent AI Analyses & Recommendations
  const activeIncidents = incidents.filter(i => i.status !== 'Resolved').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recentAiAnalyses = activeIncidents.slice(0, 3).map((inc, i) => ({
    id: `AI-${inc._id}`,
    incidentId: inc._id.toString().substring(inc._id.toString().length - 6).toUpperCase(),
    title: `AI Analysis for ${inc.title.substring(0,30)}...`,
    timestamp: new Date(inc.createdAt).toLocaleString(),
    confidence: `${inc.aiScore || 90}% Confidence`,
    summary: inc.aiSummary || 'Analyzed via Gemini AI model.'
  }));

  const upcomingRecommendations = activeIncidents.slice(0, 3).flatMap(inc => {
    if (inc.recommendations && inc.recommendations.length > 0) {
      const rec = inc.recommendations[0];
      return {
        id: `UR-${rec._id || Math.random()}`,
        incidentId: inc._id.toString().substring(inc._id.toString().length - 6).toUpperCase(),
        title: rec.action,
        impact: rec.description,
        confidence: rec.confidence || 90
      }
    }
    return [];
  }).slice(0, 3);

  res.status(200).json({
    success: true,
    data: {
      severityDistribution,
      categoryBreakdown,
      trendData,
      timeTrendData,
      recentAiAnalyses,
      upcomingRecommendations
    }
  });
});
