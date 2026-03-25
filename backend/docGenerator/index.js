'use strict';

const { Document, Packer } = require('docx');
const constants = require('./constants');
const helpers   = require('./helpers');
const numberUtils = require('./numberUtils');
const tables    = require('./tables');
const { makeHeader, makeFooter } = require('./headerFooter');

// Section Modules
const { getOfferLetter }       = require('./sections/offerLetter');
const { getAppointmentLetter } = require('./sections/appointmentLetter');
const { getAnnexureA }         = require('./sections/annexureA');
const { getAnnexureB }         = require('./sections/annexureB');

/**
 * Main function to generate the complete Offer and Appointment Letter document.
 * @param {Object} d - Form data from the frontend
 * @returns {Promise<Buffer>} - The generated Word document as a buffer
 */
async function generateDoc(d) {
  const { PAGE_W, PAGE_H, MAR_TOP, MAR_RIGHT, MAR_BOT, MAR_LEFT, NUMBERING, C } = constants;

  const pageProps = {
    page: {
      size:   { width: PAGE_W, height: PAGE_H },
      margin: { top: MAR_TOP, right: MAR_RIGHT, bottom: MAR_BOT, left: MAR_LEFT, header: 708, footer: 708 },
    },
  };

  const header = makeHeader(d.orgName || '', d.cin || '');
  const footer = makeFooter();

  // Assemble all sections
  const offerLetter       = getOfferLetter(d, helpers, tables, constants, numberUtils);
  const appointmentLetter = getAppointmentLetter(d, helpers, tables, constants, numberUtils);
  const annexureA         = getAnnexureA(d, helpers, tables, constants, numberUtils);
  const annexureB         = getAnnexureB(d, helpers, tables, constants, numberUtils);

  const doc = new Document({
    numbering: NUMBERING,
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22, color: '000000' } },
      },
    },
    sections: [{
      properties: pageProps,
      headers: { default: header },
      footers: { default: footer },
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
