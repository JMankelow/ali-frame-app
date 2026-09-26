// Real Ali Frame email wording, transcribed from Jo's "Ali Frame Quotation.docx"
// (2026-09-26). Idempotent: upserts by template name so re-running just
// refreshes wording rather than duplicating rows.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SIGNOFF_SALES = "Sales Team\n34a Allens Road, East Tamaki\nPO Box 259092, Botany, Auckland 2163";

const TEMPLATES = [
  {
    name: "Quote Follow Up",
    subject: "Following up on your quote — Ali Frame Windows & Doors",
    body:
      `Hey\n\nJust a follow up email from us to check you received the quote from our team and if you had any queries.\n\n` +
      `If you do not wish to proceed with the quote let me know and I can close it off.\n\n` +
      `Please feel free to give us a call if you have any questions.\n\nKind Regards\n\n${SIGNOFF_SALES}`,
  },
  {
    name: "Final Follow Up on Quote",
    subject: "Final Follow up on Quote - Ali Frame Windows & Doors",
    body:
      `Hey,\n\nWe just wanted to follow up as we haven't heard back from you since our last message a couple of weeks ago ` +
      `regarding your enquiry.\n\nIf you've decided not to proceed, please let us know so we can close off your file. ` +
      `Of course, if you have any questions or need further information, we're happy to help.\n\n` +
      `Thanks again, and all the best.\n\nKind Regards\n\n${SIGNOFF_SALES}`,
  },
  {
    name: "Quote Acceptance",
    subject: "Quote Accepted — [Client Name]",
    body:
      `Hi\n\nWe would like to let you know that {Client Name} has recently accepted our quote.\n\n` +
      `We are currently awaiting the deposit payment. Once received, we will arrange the check measure. ` +
      `Following completion of the check measure, we will send through the schedule along with a Purchase Order ` +
      `so that you can proceed or make any necessary changes if required.\n\n` +
      `We will be in touch again in due course with further updates.\n\nThank you.\n\n${SIGNOFF_SALES}`,
  },
  {
    name: "Commercial Acceptance",
    subject: "Next Steps — {Address}",
    body:
      `Hi,\n\nThank you for accepting our quote for {Address}.\n\n` +
      `To proceed efficiently with scheduling and planning your job, please provide the following information at ` +
      `your earliest convenience:\n\n` +
      `- Estimated installation date\n- Purchase Order number (for billing purposes)\n` +
      `- Any Health & Safety requirements specific to your site\n- Manufacturer QA questionnaires (if Ali Frame is required to complete any)\n` +
      `- Confirmation of site measure (if included in the quote)\n\n` +
      `If you have already advised an ETA of [Insert Date], please confirm whether any of the above items are required or still outstanding.\n\n` +
      `Once we receive this information, we'll be able to lock your job into our calendar and advise if anything further is needed.\n\n` +
      `If you have any questions in the meantime, please don't hesitate to get in touch.\n\n` +
      `Tanya Cleghorn\nOperations Manager\nPh: 027 231 8160  |  34a Allens Road, East Tamaki, PO Box 259092, Botany, Auckland 2163`,
  },
  {
    name: "Welcome Email",
    subject: "Welcome to Ali Frame — {Address}",
    body:
      `Hi {Client Name},\n\nThank you for choosing us to carry out your joinery project at {Address}.\n\n` +
      `Once your deposit is paid Tanya will be your main point of contact, she is available on 027 231 8160 or via ` +
      `email tanya@aliframe.co.nz should you have any questions. For any queries regarding your installation date, ` +
      `please feel free to call or email her directly.\n\n` +
      `Tanya works closely with Tristam, who helps manage all installations with Tanya, to ensure everything runs smoothly.\n\n` +
      `What Happens Next?\n\n` +
      `Deposit Invoice: You'll shortly receive your deposit invoice. Once paid, Tanya will be in touch to schedule a ` +
      `final check measure at your site. Please allow up to one week for this to be completed.\n\n` +
      `Order Placement: Following the check measure, we'll place your order with our manufacturers.\n\n` +
      `Lead Time: Currently, there is a 6-week lead time from acceptance to installation. Once we receive an ETA from ` +
      `the manufacturer, we will provide you with a projected installation timeframe.\n\n` +
      `Pre-Installation Update: A few days prior to installation, we'll contact you with an estimated time of arrival ` +
      `and address any final queries or special requirements.\n\n` +
      `Progress Payment: 50% progress payment invoice will be issued 2 days before install, payable before delivery.\n\n` +
      `Final Inspection & Payment: After installation, you'll have up to one week to review the work. The final 10% ` +
      `invoice will be issued after this period, once any necessary remedial work is completed and you're satisfied.`,
  },
  {
    name: "Please Quote — Supplier",
    subject: "Please Quote — {Job Number}",
    body:
      `Hi,\n\nPlease find attached the measure for {Job Number}.\n\n` +
      `Could you kindly provide a quote based on the attached details.\n\n` +
      `If you have any questions or need further information, feel free to get in touch.`,
  },
  {
    name: "Final Check Measure",
    subject: "Final Check Measure — {Job Number}",
    body:
      `Hi,\n\nPlease find attached your final check measure.\n\n` +
      `We've placed the order with our supplier today, and we'll update you with an estimated delivery and ` +
      `installation date as soon as we receive confirmation.\n\n` +
      `If you have any questions or concerns regarding the check measure, please don't hesitate to get in touch.`,
  },
  {
    name: "Installation ETA",
    subject: "Your Estimated Installation Date — {Job Number}",
    body:
      `Hi {Client Name},\n\nWe have received an estimated delivery date of [date] for your joinery. This is an ETA ` +
      `from the supplier and may change.\n\n` +
      `Based on this ETA, we have pencilled in your installation for [installation date]. We expect the work to take ` +
      `approximately [number] day(s). If the joinery delivery date changes, we may need to adjust the installation ` +
      `date as well.\n\n` +
      `We'll be in touch closer to the time to confirm the date. Please let me know if you have any questions.`,
  },
  {
    name: "Change to Delivery/Installation Date",
    subject: "Update to Your Installation Date — {Job Number}",
    body:
      `Hi {Client Name},\n\nYour delivery and installation date has changed to [New Date].\n\n` +
      `We apologise for any inconvenience. The Ali Frame team will be onsite on the new date between 8:00 AM and 8:30 AM.\n\n` +
      `Please confirm that the new date works for you by texting me at 027 231 8160. If you have any questions or ` +
      `need to discuss anything further, don't hesitate to get in touch.`,
  },
  {
    name: "Final Installation Date",
    subject: "Confirming Your Installation Date — {Job Number}",
    body:
      `Hi,\n\nWe are confirming delivery and installation for [Insert Date].\n\n` +
      `The Ali Frame team will be onsite between 7:30 AM and 8:30 AM.\n\n` +
      `Please confirm that this time works for you by sending a text to me at 027 231 8160.\n\n` +
      `If you have any questions or need to discuss anything further, don't hesitate to get in touch.\n\nKind regards,`,
  },
];

async function main() {
  const admin = await prisma.user.findFirst({ where: { isSuperUser: true }, orderBy: { createdAt: "asc" } });
  if (!admin) throw new Error("No super-user account found to attribute these templates to.");

  let created = 0;
  let updated = 0;
  for (const t of TEMPLATES) {
    const existing = await prisma.emailTemplate.findFirst({ where: { name: t.name } });
    if (existing) {
      await prisma.emailTemplate.update({ where: { id: existing.id }, data: { subject: t.subject, body: t.body } });
      updated += 1;
    } else {
      await prisma.emailTemplate.create({ data: { ...t, createdById: admin.id } });
      created += 1;
    }
  }
  console.log(`Created ${created} templates, updated ${updated} existing.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
