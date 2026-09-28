const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  severity: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low'],
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  affectedService: {
    type: String,
    required: true,
  },
  affectedRegion: {
    type: String,
    default: 'Global',
  },
  status: {
    type: String,
    enum: ['Investigating', 'Active', 'Mitigated', 'Resolved'],
    default: 'Investigating',
  },
  source: {
    type: String,
    default: null,
  },
  rawPayload: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  normalizedTelemetry: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  anomalies: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  anomalySummary: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  identifiedIncident: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  incidentHypotheses: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  aiScore: {
    type: Number,
    default: null,
  },
  aiSummary: {
    type: String,
    default: null,
  },
  rootCause: {
    summary: String,
    details: String,
    confidence: Number,
    evidence: [String]
  },
  businessImpact: {
    affectedUsers: String,
    regions: [String],
    estimatedRevenueLoss: String,
    serviceDegradation: String
  },
  recommendations: [{
    action: String,
    description: String,
    confidence: Number,
    type: { type: String }, // e.g., Mitigation, Scale, Config
    command: String
  }],
  timeline: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimelineEvent'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // keeping it optional for the current phase where auth is mocked
  }
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema);
