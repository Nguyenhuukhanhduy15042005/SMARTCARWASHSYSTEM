const fs = require('fs');
const content = fs.readFileSync('C:/Users/TrinhDinhTrong/OneDrive/문서/GitHub/SMARTCARWASHSYSTEM/Back-end/routes/booking.js', 'utf8');
const lines = content.split('\n');
let startLine = -1;
lines.forEach((line, index) => {
  if (line.includes("router.post('/',") || line.includes("router.post(\"/\",") || (line.includes("router.post(") && line.includes("'/'"))) {
    startLine = index;
  }
});
if (startLine !== -1) {
  console.log("Found router.post('/') in booking.js:");
  for (let i = Math.max(0, startLine - 2); i < Math.min(lines.length, startLine + 60); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} else {
  console.log("router.post('/') not found.");
}
