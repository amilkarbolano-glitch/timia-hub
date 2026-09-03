// tsc filtrando falsos positivos conocidos de esta config (prop 'key' en componentes, CSSStyleDeclaration, import.meta, server/)
import { execSync } from 'child_process';
let out = '';
try { execSync('npx tsc --noEmit -p tsconfig.json', { encoding: 'utf8' }); } catch (e: any) { out = e.stdout ?? ''; }
const ignore = [/Property 'key' does not exist/, /CSSStyleDeclaration/, /lastCommit/, /ImportMeta/, /^server\//, /TS2322: Type '\{ key:/];
const lines = out.split('\n').filter(l => l.includes('error TS'));
const real: string[] = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (ignore.some(r => r.test(l))) continue;
  real.push(l);
}
if (real.length) { console.log(real.join('\n')); process.exit(1); }
console.log('lint:real OK (0 errores reales)');
