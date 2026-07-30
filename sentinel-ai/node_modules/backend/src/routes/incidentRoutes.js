const express = require('express');
const { check } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const {
  createIncident,
  getAllIncidents,
  getIncidentById,
  updateIncident,
  deleteIncident
} = require('../controllers/IncidentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

const incidentValidation = [
  check('title', 'Title is required').not().isEmpty(),
  check('description', 'Description is required').not().isEmpty(),
  check('severity', 'Severity must be Critical, High, Medium, or Low').isIn(['Critical', 'High', 'Medium', 'Low']),
  check('category', 'Category is required').not().isEmpty(),
  check('affectedService', 'Affected Service is required').not().isEmpty()
];

router.route('/')
  .post(protect, incidentValidation, validateRequest, createIncident)
  .get(getAllIncidents);

router.route('/:id')
  .get(getIncidentById)
  .put(protect, incidentValidation, validateRequest, updateIncident)
  .delete(protect, deleteIncident);

module.exports = router;
