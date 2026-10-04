// One-off: loads Ali-Frame's own Company Hazard & Risk Register (Hazard & Risk Management
// Procedure V2) and Training & Competency Register (xlsx) into the app. Skips a table that
// already has rows, so it is safe to re-run.
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const RISKS = [
  { activity: "Vehicle Movements & Deliveries (On-site manoeuvring)", hazard: "Delivery trucks, company vans, reversing or navigating tight multi-story site zones near workers.", potentialHarm: "Workers or pedestrians struck, crushed, or pinned by reversing work vehicles/mobile plant.", initialRisk: "CRITICAL", controls: 'Implement a "No Reversing Without a Trained Spotter" rule. Establish physical separation barriers between vehicle routes and pedestrian zones', residualRisk: "LOW" },
  { activity: "Manual Lifting of Frames (Unloading & multi-story transit)", hazard: "Manually lifting, carrying, and manoeuvring heavy, bulky assembled window/door frames across site and fixing into structural openings.", potentialHarm: "Acute lower back strains, disc injuries, torn shoulder ligaments, or crushed feet. Musculoskeletal disorders (RSI, rotator cuff tears)", initialRisk: "HIGH", controls: "Enforce a mandatory team lift (2+ people) for frames over 20kg. Use mechanical aids such as all-terrain frame trolleys, site cranes, or material hoists for multi-story transport. Ensure clear, level transit paths.", residualRisk: "MEDIUM" },
  { activity: "Site Environments (Shared multi-story sites)", hazard: "Uneven surfaces, construction debris, overhead work by other trades, unbarricaded edges/voids.", potentialHarm: "Trips/falls, being struck by falling objects from upper levels, or crushed by mobile plant.", initialRisk: "HIGH", controls: "Conduct a pre-start site hazard assessment daily. Establish clear, barricaded exclusion zones. Wear high-vis vests, hard hats, and steel-cap boots. Coordinate schedules with other trades working above/below.", residualRisk: "LOW" },
  { activity: "Working at Heights (Upper-floor installations)", hazard: "Working near unprotected edges, internal structural voids, or on scaffolding/EWPs.", potentialHarm: "Falls from height causing severe fractures, permanent disability, or fatalities.", initialRisk: "CRITICAL", controls: "Use certified scaffolding, perimeter edge protection, or Elevating Work Platforms (EWPs). No work on unsecured ladders.", residualRisk: "MEDIUM" },
  { activity: "Power Tools & Cutters (Drop saws, grinders, drills)", hazard: "Using high-speed cutting or fastening tools near hands and face.", potentialHarm: "Severe cuts, amputations, eye injuries from flying shards, or hearing loss.", initialRisk: "HIGH", controls: "Keep all mechanical and factory guards fitted. Mandatory safety glasses/face shields and hearing protection. Ensure all site power tools are test-tagged and run through a functional RCD.", residualRisk: "LOW" },
  { activity: "Sealants & Foam (Weatherproofing frames)", hazard: "Chemical exposure during high-volume application of structural silicones and expanding foams.", potentialHarm: "Skin irritation, occupational dermatitis, or respiratory discomfort from chemical vapours.", initialRisk: "LOW", controls: "Apply sealants in well-ventilated areas or open structures. Wear nitrile gloves and safety glasses during application. Keep Safety Data Sheets (SDS) readily accessible in work vehicles.", residualRisk: "LOW" },
];

// name, siteSafe/licence no, role, qualifications, expiry (dd.mm.yyyy), years, competency (1-5) — from "Ali Frame Training and Competency Register.xlsx"
const PEOPLE = [
  ["Kere Taaka Tekaute", "908885", "Commercial Manager", "Site Safe - EWP - First Aid", "19.02.2028", "15+", 5],
  ["Tristam Kingi", "908888", "Residential Manager / Senior Leader", "Site Safe - First Aid - BCITO Qualified - AAAJ", "19.02.2028", "10+", 5],
  ["Amanaki Fukofuka", "386396", "Senior Installer / Glazier", "Site Safe - First Aid - BCITO Qualified - AAAJ", "19.02.2026", "10+", 5],
  ["Jake Iakopo", "537048", "Senior Installer / Glazier", "Site Safe - First Aid - BCITO Qualified - AAAJ", "19.02.2026", "10+", 5],
  ["Aisea Fifita", "883827", "Senior Installer / Glazier", "Site Safe - First Aid - BCITO Qualified - EWP", "19.02.2026", "5+", 5],
  ["Siauane Siauane", "908889", "Senior Installer / Glazier", "Site Safe - BCITO Qualified - EWP 17600, 25045, 23229 - AAAJ", "19.02.2026", "11+", 5],
  ["Gulio Afu", "520388", "Senior Installer / Glazier", "Site Safe - BCITO Qualified", "19.02.2026", "5+", 4],
  ["Tapu Veainu", "926861", "Intermediate Installer", "Site Safe, BCITO Apprentice", "19.10.2028", "3+", 3],
  ["Fale Veainu", "1070484", "Junior Installer", "Site Safe", "09.10.2027", "2+", 2],
  ["Matt Batey", "1070483", "Junior Installer", "Site Safe", "09.10.2027", "2+", 2],
  ["Ceejay Terite", "1070482", "Junior Installer", "Site Safe", "09.10.2027", "2+", 2],
  ["Ryan Kopara", "1021224", "Intermediate Installer", "Site Safe, BCITO Apprentice", "", "6+", 4],
  ["Issac Folau", "", "Intermediate Installer", "", "", "6+", 3],
  ["Daniel Naera", "857075", "Licensed Builder", "LBP", "03.08.2027", "10+", 5],
  ["Junior Taurarii", "819780", "Qualified Installer / Contractor", "Business Owner / Installation of Aluminium Joinery", "16.12.2027", "10+", 5],
  ["Mike Bryes", "731234", "Licensed Builder", "LBP", "20.03.2028", "10+", 5],
];

const toDate = (s) => (s ? new Date(`${s.slice(6)}-${s.slice(3, 5)}-${s.slice(0, 2)}T00:00:00Z`) : null);
const norm = (s) => s.toLowerCase().replace(/[^a-z ]/g, "").split(/\s+/).filter(Boolean);

try {
  if ((await p.hsRisk.count()) === 0) {
    await p.hsRisk.createMany({ data: RISKS });
    console.log(`Risk register: loaded ${RISKS.length}`);
  } else console.log("Risk register already has rows — skipped");

  if ((await p.hsCompetency.count()) === 0) {
    const users = await p.user.findMany({ select: { id: true, name: true } });
    let i = 0;
    for (const [name, no, role, quals, exp, years, comp] of PEOPLE) {
      const [first, ...rest] = norm(name);
      const last = rest[rest.length - 1];
      const hits = users.filter((u) => {
        const t = norm(u.name);
        return t[0] === first && (!last || t.includes(last) || t[t.length - 1] === last);
      });
      const userId = hits.length === 1 ? hits[0].id : null;
      await p.hsCompetency.create({
        data: { name, userId, siteSafeNumber: no || null, keyRole: role, qualifications: quals || null, expiryDate: toDate(exp), yearsExperience: years, competency: comp, sortOrder: i++ },
      });
      console.log(`  ${name.padEnd(20)} ${userId ? "linked to app user " + hits[0].name : "(no matching app user)"}`);
    }
  } else console.log("Competency register already has rows — skipped");
} finally {
  await p.$disconnect();
}
