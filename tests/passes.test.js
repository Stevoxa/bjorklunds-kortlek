const test = require('node:test');
const assert = require('node:assert/strict');
const { shuffleArray, assignPasses } = require('../passes.js');

const names = ['Anna', 'Bertil', 'Cecilia', 'David', 'Erik', 'Frida'];

// Deterministisk slumpkälla så att testerna går att upprepa.
function seededRandom(seed) {
    let state = seed;
    return () => {
        state = (Math.imul(state, 1103515245) + 12345) >>> 0;
        return state / 4294967296;
    };
}

test('shuffleArray returnerar samma element och rör inte originalet', () => {
    const original = [...names];
    const shuffled = shuffleArray(original, seededRandom(1));
    assert.deepEqual(original, names);
    assert.deepEqual([...shuffled].sort(), [...names].sort());
});

test('shuffleArray klarar tom lista och ett element', () => {
    assert.deepEqual(shuffleArray([]), []);
    assert.deepEqual(shuffleArray(['Anna']), ['Anna']);
});

// Mot Math.random: förväntat 10 000 per ordning, toleransen 600 är över sex standardavvikelser.
test('shuffleArray ger varje ordning ungefär lika ofta', () => {
    const counts = new Map();
    const runs = 60000;
    for (let i = 0; i < runs; i++) {
        const key = shuffleArray(['A', 'B', 'C']).join('');
        counts.set(key, (counts.get(key) || 0) + 1);
    }
    assert.equal(counts.size, 6);
    for (const count of counts.values()) {
        assert.ok(Math.abs(count - runs / 6) < runs * 0.01, `snedfördelning: ${count}`);
    }
});

test('standard: varje passkytt får exakt ett pass, numrerat 1..n', () => {
    for (let seed = 1; seed <= 50; seed++) {
        const { assignments, unassigned } = assignPasses(names, 'standard', [], seededRandom(seed));
        assert.deepEqual(assignments.map(a => a.pass), names.map((_, i) => `Pass ${i + 1}`));
        assert.deepEqual(assignments.map(a => a.participant).sort(), [...names].sort());
        assert.deepEqual(unassigned, []);
    }
});

test('standard: egna pass ignoreras', () => {
    const { assignments } = assignPasses(names, 'standard', ['Tornet', 'Bäcken']);
    assert.equal(assignments.length, names.length);
});

test('avancerad: lika många pass som skyttar ger ett pass var', () => {
    const passes = ['1', '2', '3', 'Tornet', 'Bäcken', 'Mossen'];
    const { assignments, unassigned } = assignPasses(names, 'advanced', passes, seededRandom(7));
    assert.deepEqual(assignments.map(a => a.pass), passes);
    assert.deepEqual(assignments.map(a => a.participant).sort(), [...names].sort());
    assert.deepEqual(unassigned, []);
});

test('avancerad: fler pass än skyttar ger lediga pass', () => {
    const passes = ['1', '2', '3', '4', '5', '6', '7', '8'];
    const { assignments, unassigned } = assignPasses(names, 'advanced', passes, seededRandom(3));
    const taken = assignments.filter(a => a.participant !== null);
    assert.equal(assignments.length, 8);
    assert.equal(taken.length, names.length);
    assert.equal(new Set(taken.map(a => a.participant)).size, names.length);
    assert.deepEqual(unassigned, []);
});

test('avancerad: färre pass än skyttar ger oplacerade, ingen dubbelt', () => {
    const passes = ['Tornet', 'Bäcken', 'Mossen'];
    const { assignments, unassigned } = assignPasses(names, 'advanced', passes, seededRandom(9));
    const placed = assignments.map(a => a.participant);
    assert.equal(placed.length, 3);
    assert.ok(placed.every(p => p !== null));
    assert.equal(unassigned.length, 3);
    assert.deepEqual([...placed, ...unassigned].sort(), [...names].sort());
});

test('tom lista med passkyttar ger inga tilldelningar i standardläge', () => {
    assert.deepEqual(assignPasses([], 'standard'), { assignments: [], unassigned: [] });
});

test('alla skyttar kan hamna på alla pass', () => {
    const seen = new Set();
    const random = seededRandom(123);
    for (let i = 0; i < 2000; i++) {
        assignPasses(names, 'standard', [], random).assignments
            .forEach(a => seen.add(`${a.pass}:${a.participant}`));
    }
    assert.equal(seen.size, names.length * names.length);
});

test('avancerad utan passkyttar ger bara lediga pass', () => {
    const { assignments, unassigned } = assignPasses([], 'advanced', ['Tornet', 'Bäcken']);
    assert.deepEqual(assignments, [
        { pass: 'Tornet', participant: null },
        { pass: 'Bäcken', participant: null }
    ]);
    assert.deepEqual(unassigned, []);
});

test('avancerad utan egna pass gör alla oplacerade', () => {
    const { assignments, unassigned } = assignPasses(names, 'advanced', []);
    assert.deepEqual(assignments, []);
    assert.deepEqual([...unassigned].sort(), [...names].sort());
});

test('passes.js lägger funktionerna globalt när den laddas som vanligt skript', () => {
    const vm = require('node:vm');
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.join(__dirname, '..', 'passes.js'), 'utf8');
    const context = vm.createContext({});
    vm.runInContext(source, context);
    assert.equal(typeof context.assignPasses, 'function');
    assert.equal(typeof context.shuffleArray, 'function');
});
