// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.

// Ali-Frame's own Health & Safety documents, transcribed from the company Word documents
// (SSSP 2026 Documents). Light markup: "# " title, "## " heading, "- " bullet, "| a | b |" table row
// (first row is the header), blank line = paragraph break.

export interface HsDocSeed {
  slug: string;
  title: string;
  sortOrder: number;
  version: string;
  effectiveDate?: string;
  nextReviewDate?: string;
  content: string;
}

export const HS_IMPORT_STATUS = "IMPORTED FROM ALI-FRAME DOCUMENT — PENDING ORGANISATION REVIEW";

export const HS_DOCS: HsDocSeed[] = [
  {
    slug: "policy",
    title: "Health & Safety Policy",
    sortOrder: 1,
    version: "V2 (1 June 2026)",
    effectiveDate: "2026-06-01",
    nextReviewDate: "2027-06-01",
    content: `We are committed to health and safety, and we will ensure, so far as reasonably practicable, the health and safety of all our workers and other people who may be put at risk from our work. We will address this duty of care by, so far as is reasonably practicable:
- Complying with the Health & Safety at Work Act 2015 (HSW Act) and Health & Safety at Work Regulations (HSW Regulations), standards, relevant codes of practice and guidelines.
- Providing and maintaining a work environment or work premises that are without risks to health & safety.
- Providing and maintaining safe plant and structures.
- Providing and maintaining safe systems of work;
- Ensuring the safe use, handling, storage and transportation of hazardous substances;
- Providing and maintaining adequate facilities for the welfare of workers;
- Monitoring the health of our workers and conditions at the workplace to prevent illness or injury;
- Providing information, training, instruction, and supervision necessary to protect workers from risks associated with their work.
- Ensuring all contractors are suitably qualified and competent to undertake the work for which they are engaged.
- Accurately reporting and recording all workplace accidents, incidents, injuries (events) and near-misses;
- Promoting worker engagement, participation and consultation in health and safety decision-making.
- Ensuring appropriate processes are in place for receiving, considering and responding in a timely manner to information regarding incidents, hazards and risks;
- Providing safe means of access to and from places of work;
- Reviewing, revising and evaluating our health & safety management systems and processes annually to ensure continuous improvement; and
- Supporting the safe and early return to work of injured workers

Every employee is expected to share their commitment to health and safety.

## Responsibilities
Management will:
- Provide leadership and resources for health and safety.
- Ensure hazards and risks are effectively managed.
- Provide training, supervision and information.
- Investigate incidents and implement corrective actions.
- Consult with workers on health and safety matters.

Workers will:
- Take reasonable care of their own health and safety and that of others.
- Follow company procedures and site requirements.
- Use equipment and PPE correctly.
- Report hazards, incidents and near misses.
- Participate in health and safety initiatives and consultations.

Our Health and Safety representative is responsible for implementing, monitoring, reviewing and planning health and safety policies, systems and practices.

Signed: Joanne Mankelow, Managing Director — 1st June 2026

Document Owner: Ali-Frame Windows & Doors
Date: June 2026
Review Date: June 2027

This policy applies to all Ali-Frame employees, contractors and visitors engaged in company activities.`,
  },
  {
    slug: "hazard-risk-procedure",
    title: "Hazard & Risk Management Procedure",
    sortOrder: 2,
    version: "V2 (08.06)",
    content: `## Purpose
Ali Frame will identify, assess and manage hazards arising from its aluminium joinery delivery, removal, installation, glazing and remedial work.

Risks will be eliminated so far as reasonably practicable. Where elimination is not reasonably practicable, risks will be minimised using the hierarchy of controls.

## Hazard Identification
Hazards are identified through:
- Company hazard and risk registers
- Site-specific safety plans and inductions
- Live Task Analyses in Site App Pro
- Pre-start site assessments
- Worker observations and consultation
- Toolbox meetings
- Incident and near-miss investigations
- Changes to site conditions, equipment or work activities

## Risk Assessment
Each hazard is assessed by considering:
- The likelihood of harm occurring
- The potential consequence or severity of harm
- The people who may be affected
- Existing controls and site conditions

The initial risk is assessed before additional controls are applied. The residual risk is assessed after the selected controls have been implemented.

## Risk Response Levels
CRITICAL – Stop work immediately. Work must not begin or continue until the risk has been eliminated or reduced. Management approval is required before work resumes.

HIGH – Controls must be implemented before work begins. The Site Supervisor must confirm that the controls are suitable and the residual risk is acceptable.

MEDIUM – Planned controls must be implemented and communicated to affected workers. Controls must be monitored during the work.

LOW – Maintain routine controls and monitor for changes.

## Control Measures
Controls are selected using the following hierarchy:
- Eliminate the hazard.
- Substitute it with something safer.
- Isolate people from the hazard.
- Use engineering controls.
- Use administrative controls, training and supervision.
- Use appropriate PPE.

Higher-level controls must be considered before relying on administrative controls or PPE.

## Consultation and Coordination
Relevant hazards and controls will be communicated to workers, the Main Contractor and other affected PCBUs.

Ali Frame will consult, cooperate and coordinate with other PCBUs where health and safety duties overlap.

## Monitoring and Review
Controls will be reviewed:
- Before work starts and when site conditions change
- When the scope, equipment or work method changes
- Following an incident, hazard or near miss
- During site inspections and toolbox meetings
- When a worker raises a concern
- During management review

If a control is ineffective, work must stop where necessary and the risk must be reassessed before work continues.

## Records
Site-specific hazards, live Task Analyses, risk assessments, toolbox records and corrective actions are recorded in Site App Pro.

Corrective actions will be assigned to a responsible person and monitored until completed and confirmed effective.

The Company Hazard and Risk Register is maintained on the Risk Register tab.`,
  },
  {
    slug: "incident-procedure",
    title: "Incident Reporting & Investigation Procedure",
    sortOrder: 3,
    version: "V2 (08.06)",
    content: `## Purpose
Ali-Frame is committed to reporting, recording, investigating and learning from all incidents, injuries, near misses and hazards to prevent recurrence and improve workplace health and safety.

## Reporting Requirements
All workers must immediately report:
- Injuries and illnesses
- Near misses
- Hazards
- Property damage
- Vehicle incidents
- Environmental incidents

Where immediate reporting is not possible, incidents must be reported as soon as practicable.

## Incident Response
Following an incident:
- Stop work and make the area safe.
- Provide first aid or emergency assistance where required.
- Notify the Site Supervisor or Manager.
- Record the incident in Site App Pro.
- Preserve the scene where the incident may be notifiable under the Health and Safety at Work Act 2015.

## Investigation
All incidents and near misses will be reviewed to determine:
- What happened
- Why it happened
- Whether existing controls were effective
- What corrective actions are required

Investigations will be proportionate to the severity and potential consequences of the event.

## Corrective Actions
Corrective actions identified through investigations will be:
- Assigned to a responsible person
- Recorded in Site App Pro
- Monitored until completed
- Reviewed to ensure effectiveness

## Notifiable Events
Where an incident is notifiable under the Health and Safety at Work Act 2015:
- Emergency services will be contacted where required.
- WorkSafe New Zealand will be notified as soon as possible.
- The incident scene will be preserved until released by WorkSafe, unless action is required to assist injured persons or make the area safe.

## Communication and Review
Relevant findings, lessons learned and corrective actions will be communicated to workers through toolbox meetings, safety discussions or other appropriate methods.

Incident trends and corrective actions will be reviewed periodically to support continuous improvement of Ali-Frame's health and safety system.`,
  },
  {
    slug: "return-to-work",
    title: "Return to Work Procedure",
    sortOrder: 4,
    version: "V2 (08.06)",
    content: `## Purpose
Ali-Frame is committed to supporting injured or unwell workers to safely and sustainably return to work as soon as reasonably practicable.

## Procedure
Where a worker is injured or unable to perform their normal duties:
- Appropriate medical treatment shall be obtained.
- The injury or illness shall be reported in accordance with the Incident Reporting Procedure.
- Ali-Frame will consult with the worker, medical provider and ACC (where applicable) to identify suitable duties.
- Suitable duties may be provided where reasonably practicable and medically approved.

Any return-to-work plan will consider:
- Medical restrictions
- Worker capability
- Available duties
- Workplace safety requirements

Progress will be monitored and reviewed until the worker is able to resume normal duties or an alternative arrangement is agreed.

## Responsibilities
Management:
- Support injured workers throughout rehabilitation.
- Provide suitable duties where reasonably practicable.
- Maintain confidentiality of medical information.
- Consult with ACC and treatment providers where required.

Workers:
- Participate in agreed rehabilitation and return-to-work plans.
- Provide relevant medical information regarding work restrictions.
- Advise management of any difficulties or concerns regarding their return to work.

## Review
Return-to-work arrangements will be reviewed regularly to ensure they remain appropriate and support the worker's recovery.`,
  },
  {
    slug: "ppe",
    title: "On-site PPE Requirements & Standards",
    sortOrder: 5,
    version: "V2 (08.06)",
    content: `Ali-Frame requires all workers, subcontractors, and visitors to wear appropriate Personal Protective Equipment (PPE) to reduce the risk of injury while carrying out work activities.

PPE requirements are determined by:
- site rules,
- task-specific risks,
- manufacturer recommendations,
- Ali-Frame safe work procedures.

Where reasonably practicable, risks are managed using elimination, substitution, isolation, engineering, and administrative controls before PPE is relied upon.

## Responsibilities
Workers are responsible for:
- wearing PPE correctly,
- maintaining PPE in good condition,
- reporting damaged PPE,
- and replacing PPE when required.

Ali-Frame will:
- provide required PPE,
- replace PPE subject to fair wear and tear,
- and ensure workers are trained in correct PPE use.

Where site-specific PPE requirements exceed Ali-Frame minimum standards, the site requirements shall apply.

## Mandatory PPE
The following PPE is mandatory on all Ali-Frame construction sites unless otherwise instructed:
- Safety footwear
- Hi-visibility clothing
- Safety glasses
- Gloves appropriate to task

| PPE Item | Required When | Inspection / Replacement |
| Safety Boots | All construction sites | Replace if damaged, leaking, or toe cap is exposed. |
| Safety Glasses | Cutting, grinding, drilling, or glass handling | Replace if scratched, cracked, or otherwise damaged. |
| Hearing Protection | Using noisy equipment or power tools | Replace if damaged, worn, or no longer effective. |
| Hi-Visibility Clothing | All active worksites | Replace if faded, torn, or no longer clearly visible. |
| Gloves / Gauntlets | Handling glass or sharp materials | Replace if ripped, worn, or damaged. |
| Gloves | When handling any glass type | Replace if any holes or rips leave the hand or fingers exposed. |
| Respiratory Protection | Dust-generating works | Replace masks and filters regularly, or as per manufacturer recommendations. |
| Hard Hats | Sites requiring head protection | Replace if cracked, damaged, or after significant impact. |`,
  },
  {
    slug: "hazardous-substances",
    title: "Hazardous Substances Register (Vehicles)",
    sortOrder: 6,
    version: "V2 (08.06)",
    content: `The following hazardous substances exist in the workplace. A copy of the Safety Data Sheet (SDS) is held on site and in vehicles, in the event of an emergency requiring first aid.

| Product Name | Main Hazard | Typical Quantity | Product Labelled | SDS Held on site (Yes/No) |
| AT Facade | Skin/eye irritation | Up to 15 Tubes | Yes | Yes |
| Expanding Foam | Irritant / pressurized | Up to 10 Cans | Yes | Yes |
| Solvent Cleaner | Flammable / irritant | Up to 3 Bottles | Yes | Yes |
| PVA Glue | Skin/eye irritation | Up to 1 Bottle | Yes | Yes |
| MS Silicone | Skin/eye irritation | Up to 15 Tubes | Yes | Yes |

## Spill / Storage Expectations — Standard Controls
- Products to always remain labelled
- SDS available electronically or in vehicle
- Hazardous substances secured during transport
- Spills to be cleaned immediately
- PPE worn as required by SDS
- No decanting into unlabelled containers`,
  },
  {
    slug: "emergency-response",
    title: "Emergency Response Plan",
    sortOrder: 7,
    version: "V2 (08.06)",
    content: `This Emergency Response Plan applies to all Ali-Frame employees, contractors and visitors involved in delivery, handling, installation, glazing, remedial works and associated aluminium joinery activities at client sites throughout New Zealand.

## Emergency Contacts
| Role | Name | Email | Phone |
| Managing Director | Jo Mankelow | jo@aliframe.co.nz | 021 658448 |
| Commercial / Site Manager | Kere Taaka Tekaute | kere@aliframe.co.nz | 021 223 5833 |
| Health & Safety Representative | Tanya Cleghorn | tanya@aliframe.co.nz | 027 231 8160 |
| First Aider | Tristam Kingi | tristam@aliframe.co.nz | 027 239 7156 |

Where site-specific emergency procedures exist, workers must follow the Main Contractor's emergency procedures and directions.

This Emergency Response Procedure must be reviewed prior to starting works and updated if site conditions or work activities change.

## Emergency Response Process
- Stop work immediately.
- Assess the situation and remove immediate danger if safe to do so.
- Contact emergency services (111) if required.
- Provide first aid within your level of training.
- Notify the Site Supervisor and Main Contractor.
- Evacuate to the designated assembly point if required.
- Record and report the incident through Site App Pro.
- Preserve the scene if the incident is notifiable.

## Medical Emergency
- Stop work.
- Make the area safe.
- Contact 111 where required.
- Provide first aid within competency.
- Direct emergency services to the location.
- Notify the Site Supervisor.

## Falls / Working at Height Incidents
- Stop all work in the area immediately.
- Do not place additional workers at risk attempting a rescue.
- Contact emergency services immediately.
- Maintain exclusion zones below the work area.
- If a worker is suspended in a harness, implement the site rescue procedure where available and safe to do so.
- Provide location details and site access information to emergency services.
- Preserve the incident scene where required.

## Glass Breakage / Laceration Response
- Isolate the area immediately.
- Wear gloves and appropriate PPE before handling broken glass.
- Treat cuts and bleeding using first aid procedures.
- Dispose of broken glass safely in designated containers.

## Manual Handling / Crush Injury
- Do not attempt to move heavy joinery unless safe to do so.
- Remove additional hazards where possible.
- Call emergency services if crush injuries are suspected.
- Provide first aid until emergency services arrive.

## Fire Emergency
- Raise the alarm immediately.
- Evacuate to the designated assembly point.
- Only attempt to extinguish small fires if trained and safe to do so.
- Do not re-enter the work area until authorized by emergency services or site management

## Vehicle Accident
- Stop the vehicle in a safe location if possible.
- Check for injuries and call 111 where required.
- Make the area safe and use hazard warning devices.
- Notify the Site Supervisor immediately.
- Exchange details with involved parties.
- Record and report the incident.

## Severe Weather
- Stop external works during unsafe weather conditions.
- Secure loose materials and equipment.
- Follow directions from the Main Contractor.

## Worker Responsibilities
Workers must:
- Stop work when an emergency is identified.
- Raise the alarm immediately.
- Follow site emergency procedures and evacuation instructions.
- Report all incidents, hazards and near misses.
- Cooperate with emergency responders.
- Only perform emergency actions within their level of training and competency.

## Incident Preservation
Any notifiable incident under the Health and Safety at Work Act 2015 must be preserved until released by WorkSafe NZ, unless actions are required to assist injured persons or make the site safe.

## Hazardous Substance Spill
Minor spills shall be managed in accordance with the product SDS, significant spills shall be reported to the site supervisor and main contractor immediately.`,
  },
];

export const DEFAULT_SSSP_ACTIVITIES = "Manual Offloading of Joinery and Materials\nSite Installation of Aluminium Joinery";

/** Company Hazard and Risk Register (from the Hazard & Risk Management Procedure V2). */
export const RISK_LEVELS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export const RISK_COLOR: Record<string, string> = { CRITICAL: "red", HIGH: "orange", MEDIUM: "blue", LOW: "green" };

export const PRESTART_CHECKS = [
  "Fit for work (rested, no impairment)",
  "Site hazard assessment completed (access, exclusion zones, other trades above/below)",
  "PPE worn and in good condition (boots, hi-vis, safety glasses, gloves)",
  "Vehicle movements managed (trained spotter for reversing, pedestrian separation)",
  "Team lift arranged for frames over 20kg; trolleys / hoist available",
  "Work at height controls in place (scaffold / edge protection / EWP, no unsecured ladders)",
  "Power tools test-tagged, guards fitted, RCD in use",
  "Hazardous substances labelled, secured, SDS in vehicle",
  "First aid kit available; emergency contacts and assembly point known",
];
