(async () => {
  const { parseHash, normalizeRoute } = await import('../src/ui/navigationModel.ts');
  const cases = [
    ['#home', {screen:'home'}],
    ['#input/parameters', {screen:'input',sub:'parameters'}],
    ['#physics/patterns', {screen:'physics',sub:'patterns'}],
    ['#plan/options', {screen:'plan',sub:'options'}],
    ['#deliver/package', {screen:'deliver',sub:'package'}],
    ['#unknown', {screen:'home'}],
    ['#constructor', {screen:'home'}],
    ['#__proto__', {screen:'home'}],
    ['#toString', {screen:'home'}],
    ['#physics/constructor', {screen:'home'}],
    ['#plan/unknown', {screen:'home'}],
  ];
  for (const [raw, expected] of cases) {
    const actual = parseHash(raw);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${raw} -> ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  }
  for (const key of ['constructor','toString','__proto__']) {
    const actual = normalizeRoute({screen:key});
    if (actual.screen !== 'home') throw new Error(`${key} became a valid screen`);
  }
  console.log('✓ AUTOHW CORE PHASE 5 ROUTE POLICY PASS');
})().catch((error) => { console.error(error); process.exit(1); });
