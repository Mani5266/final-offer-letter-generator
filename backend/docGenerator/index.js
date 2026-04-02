'use strict';

const { Document, Packer } = require('docx');
const constants = require('./constants');
const helpers   = require('./helpers');
const numberUtils = require('./numberUtils');
const tables    = require('./tables');
const { makeHeader } = require('./headerFooter');

// Section Modules
const { getOfferLetter }       = require('./sections/offerLetter');
const { getAppointmentLetter } = require('./sections/appointmentLetter');
const { getAnnexureA }         = require('./sections/annexureA');
const { getAnnexureB }         = require('./sections/annexureB');

/**
 * Build a shared context object from form data.
 * Pre-computes values that are reused across multiple sections so each
 * section doesn't need to derive them independently.
 * @param {Object} d - Raw form data from the frontend
 * @returns {Object} ctx - Pre-computed context
 */
function buildContext(d) {
  const { formatINR, toWords, buildBreakdown, formatDate, formatTime } = numberUtils;

  const year      = new Date().getFullYear();
  const ctc       = parseInt(d.annualCTC) || 0;
  const ctcWords  = toWords(ctc);
  const breakdown = buildBreakdown(ctc);
  const firstName = (d.empFullName || '').split(' ')[0];
  const salute    = d.salutation || 'Mr.';
  const orgName   = d.orgName || '';
  const workDays  = `${d.workDayFrom || 'Monday'} to ${d.workDayTo || 'Saturday'}`;
  const workTime  = `${formatTime(d.workStart) || '10:30 AM'} to ${formatTime(d.workEnd) || '7:30 PM'} IST`;

  // Calculate annual leave from monthly leave
  const monthlyLeaveNum = parseFloat(d.monthlyLeave) || 1.5;
  const annualLeave     = Math.round(monthlyLeaveNum * 12);

  return {
    year, ctc, ctcWords, breakdown, firstName, salute, orgName,
    workDays, workTime, monthlyLeaveNum, annualLeave,
    // Pass through utility modules so sections can use them
    helpers, tables, constants, numberUtils,
    // Shorthand access to commonly used helpers
    formatINR, toWords, formatDate, formatTime,
  };
}

/**
 * Main function to generate the complete Offer and Appointment Letter document.
 * @param {Object} d - Form data from the frontend
 * @returns {Promise<Buffer>} - The generated Word document as a buffer
 */
async function generateDoc(d) {
  const { PAGE_W, PAGE_H, MAR_TOP, MAR_RIGHT, MAR_BOT, MAR_LEFT, NUMBERING } = constants;

  const ctx = buildContext(d);

  // Parse company logo from base64 data URL (if provided)
  let logoBuffer = null;
  if (d.companyLogo && d.companyLogo.startsWith('data:image')) {
    try {
      const base64Data = d.companyLogo.split(',')[1];
      if (base64Data) logoBuffer = Buffer.from(base64Data, 'base64');
    } catch (_) { /* ignore invalid logo data */ }
  }

  const pageProps = {
    page: {
      size:   { width: PAGE_W, height: PAGE_H },
      margin: { top: MAR_TOP, right: MAR_RIGHT, bottom: MAR_BOT, left: MAR_LEFT, header: 708, footer: 708 },
    },
    titlePage: true,
  };

  const header = makeHeader(d.orgName || '', d.cin || '', logoBuffer);

  // Assemble all sections — pass raw data (d) and pre-computed context (ctx)
  const offerLetter       = getOfferLetter(d, ctx);
  const appointmentLetter = getAppointmentLetter(d, ctx);
  const annexureA         = getAnnexureA(d, ctx);
  const annexureB         = getAnnexureB(d, ctx);

  const doc = new Document({
    numbering: NUMBERING,
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22, color: '000000' } },
      },
    },
    sections: [{
      properties: pageProps,
      headers: { first: header },
      children: [
        ...offerLetter,
        ...appointmentLetter,
        ...annexureA,
        ...annexureB,
      ],
    }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateDoc };
