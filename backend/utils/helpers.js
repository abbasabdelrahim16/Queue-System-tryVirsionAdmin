// utils/helpers.js

/**
 * Build a standard API response envelope.
 */
function success(res, data, status = 200, message = 'OK') {
  return res.status(status).json({ success: true, message, data });
}

function fail(res, message = 'Bad Request', status = 400) {
  return res.status(status).json({ success: false, error: message });
}

/**
 * Calculate estimated waiting time for a ticket.
 *
 * @param {number} position       – queue position of this ticket (1-based)
 * @param {number} estimatedTime  – service.estimated_time (minutes per ticket)
 * @returns {number}              – estimated wait in minutes
 */
function calcWaitTime(position, estimatedTime) {
  if (position <= 0) return 0;
  // Position 1 means one ticket ahead (the one currently being served or about to be)
  return (position - 1) * estimatedTime;
}

module.exports = { success, fail, calcWaitTime };
