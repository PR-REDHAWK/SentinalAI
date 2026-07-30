const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema({
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    required: true,
  },
  event: {
    type: String,
    required: true,
    enum: ['deployment', 'alert', 'metric', 'incident', 'ai', 'resolution', 'action', 'cron', 'external']
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
});

module.exports = mongoose.model('TimelineEvent', timelineEventSchema);
