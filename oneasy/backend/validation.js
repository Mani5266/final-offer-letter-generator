const { z } = require('zod');

// ── Zod schema for the /generate endpoint payload ──
// Validates all form fields that the docGenerator expects.
// Uses .optional() liberally since many fields have defaults in the frontend.

const generatePayloadSchema = z.object({
  // Internal: offer ID for storage path (must be valid UUID to prevent path traversal)
  _offerId: z.string().uuid().optional(),

  // Company details
  orgName: z.string().min(1, 'Organization name is required').max(200),
  entityType: z.string().max(50).optional().default('Company'),
  cin: z.string().max(100).optional().default(''),
  signatoryName: z.string().min(1, 'Signatory name is required').max(200),
  signatoryDesig: z.string().min(1, 'Signatory designation is required').max(200),
  officeAddress: z.string().min(1, 'Office address is required').max(500),
  firstAid: z.string().max(200).optional().default(''),

  // Company logo (base64 data URL, optional, max ~700KB encoded)
  companyLogo: z.string().max(750000).optional().default(''),

  // Employee details
  salutation: z.string().max(20).optional().default('Mr.'),
  empFullName: z.string().min(1, 'Employee name is required').max(200),
  empAddress: z.string().max(500).optional().default(''),
  designation: z.string().min(1, 'Designation is required').max(200),
  employeeId: z.string().max(100).optional().default(''),
  reportingManager: z.string().max(200).optional().default(''),
  attendanceSystem: z.string().max(100).optional().default('biometric attendance system'),

  // Dates
  offerDate: z.string().min(1, 'Offer date is required').max(50),
  offerValidity: z.string().min(1, 'Offer validity date is required').max(50),
  joiningDate: z.string().min(1, 'Joining date is required').max(50),

  // Compensation
  annualCTC: z.union([z.number(), z.string()]).transform(val => {
    const num = typeof val === 'string' ? Number(val) : val;
    if (isNaN(num) || num < 0) return 0;
    return Math.round(num);
  }).refine(val => val > 0, { message: 'Annual CTC must be greater than zero' }),

  // Work details
  probationPeriod: z.string().max(100).optional().default(''),
  workDayFrom: z.string().max(20).optional().default(''),
  workDayTo: z.string().max(20).optional().default(''),
  workStart: z.string().max(20).optional().default(''),
  workEnd: z.string().max(20).optional().default(''),
  breakDuration: z.string().max(100).optional().default(''),

  // Leave details
  monthlyLeave: z.string().max(100).optional().default(''),
  carryForward: z.string().max(100).optional().default(''),

  // Termination
  noticePeriod: z.string().max(100).optional().default(''),
  abscondDays: z.string().max(100).optional().default(''),
}).strip() // Strip unrecognized fields for security (prevents injection of unexpected data)
  .superRefine((data, ctx) => {
    // Cross-field date validation
    if (data.offerDate && data.offerValidity && data.offerDate >= data.offerValidity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['offerValidity'],
        message: 'Offer validity must be after the offer date',
      });
    }
    if (data.offerDate && data.joiningDate && data.offerDate > data.joiningDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['joiningDate'],
        message: 'Joining date must not be before the offer date',
      });
    }
  });

/**
 * Validate the /generate endpoint payload.
 * @param {Object} body - req.body from the request
 * @returns {{ success: boolean, data?: Object, errors?: string[] }}
 */
function validateGeneratePayload(body) {
  try {
    const result = generatePayloadSchema.safeParse(body);
    if (result.success) {
      return { success: true, data: result.data };
    }
    const errors = result.error.issues.map(
      issue => `${issue.path.join('.')}: ${issue.message}`
    );
    return { success: false, errors };
  } catch (err) {
    return { success: false, errors: ['Validation failed: ' + err.message] };
  }
}

module.exports = { validateGeneratePayload };
