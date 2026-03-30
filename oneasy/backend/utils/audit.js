const { supabaseAdmin } = require('./supabase');
const log = require('./logger');

/**
 * Log an audit event to the audit_logs table.
 * Uses the service role client to bypass RLS.
 * 
 * Table schema:
 *   id uuid (auto), user_id uuid, action text, resource text, details jsonb, created_at timestamptz
 * 
 * @param {Object} params
 * @param {string} params.user_id - The authenticated user's UUID
 * @param {string} params.action - Action performed (e.g. 'generate_document', 'create_offer')
 * @param {string} [params.resource_type] - Type of resource (e.g. 'offer_letter')
 * @param {string} [params.resource_id] - ID of the affected resource
 * @param {Object} [params.details] - Additional context/metadata
 */
async function logAudit({ user_id, action, resource_type, resource_id, details }) {
  try {
    // Build the 'resource' field as "type:id" or just "type"
    let resource = resource_type || null;
    if (resource && resource_id) {
      resource = `${resource_type}:${resource_id}`;
    }

    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id,
        action,
        resource,
        details: details || null,
      });

    if (error) {
      log.error('Audit log insert failed', { error: error.message, action });
    }
  } catch (err) {
    // Never throw — audit logging should never break the app
    log.error('Audit log error', { error: err.message, action });
  }
}

module.exports = { logAudit };
