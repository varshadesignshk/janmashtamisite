// Emit a CSV template you can hand to coordinators for offline data
// collection, then paste into the Admin → Bulk Import screen.
//
// `node scripts/template.js > chanter-template.csv`

const HEADERS = [
  "legal_name", "phone", "email", "gender", "dob",
  "address", "occupation", "languages_known", "notes",
];
const SAMPLE = [
  "Ravi Kumar,+919999000001,ravi@example.org,Male,1988-03-04,\"# 12, Madurai\",Teacher,\"Tamil, English\",",
  "Priya S,+919999000002,,,Female,,,,",
];

process.stdout.write(HEADERS.join(",") + "\n");
for (const row of SAMPLE) process.stdout.write(row + "\n");
