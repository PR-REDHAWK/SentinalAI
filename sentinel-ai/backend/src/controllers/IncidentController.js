const Incident = require('../models/Incident');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Create a new incident
// @route   POST /api/incidents
// @access  Public (Placeholder for auth)
exports.createIncident = asyncHandler(async (req, res, next) => {
  const incident = await Incident.create(req.body);

  res.status(201).json({
    success: true,
    message: "Incident created successfully",
    data: incident
  });
});

// @desc    Get all incidents
// @route   GET /api/incidents
// @access  Public
exports.getAllIncidents = asyncHandler(async (req, res, next) => {
  const incidents = await Incident.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "Incidents retrieved successfully",
    count: incidents.length,
    data: incidents
  });
});

// @desc    Get single incident
// @route   GET /api/incidents/:id
// @access  Public
exports.getIncidentById = asyncHandler(async (req, res, next) => {
  const incident = await Incident.findById(req.params.id).populate('timeline');

  if (!incident) {
    return res.status(404).json({
      success: false,
      message: "Incident not found",
      errors: []
    });
  }

  res.status(200).json({
    success: true,
    message: "Incident retrieved successfully",
    data: incident
  });
});

// @desc    Update incident
// @route   PUT /api/incidents/:id
// @access  Public
exports.updateIncident = asyncHandler(async (req, res, next) => {
  let incident = await Incident.findById(req.params.id);

  if (!incident) {
    return res.status(404).json({
      success: false,
      message: "Incident not found",
      errors: []
    });
  }

  incident = await Incident.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    message: "Incident updated successfully",
    data: incident
  });
});

// @desc    Delete incident
// @route   DELETE /api/incidents/:id
// @access  Public
exports.deleteIncident = asyncHandler(async (req, res, next) => {
  const incident = await Incident.findById(req.params.id);

  if (!incident) {
    return res.status(404).json({
      success: false,
      message: "Incident not found",
      errors: []
    });
  }

  await incident.deleteOne();

  res.status(200).json({
    success: true,
    message: "Incident deleted successfully",
    data: {}
  });
});
