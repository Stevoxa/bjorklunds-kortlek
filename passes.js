// Fördelningslogik för passen. Används av index.html och testas i tests/passes.test.js.
(function (root) {
    // Fisher–Yates: returnerar en blandad kopia, originalet lämnas orört.
    function shuffleArray(arr, random = Math.random) {
        const newArr = [...arr];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    }

    // Standard: passkyttarna fördelas över Pass 1..n.
    // Avancerad: passkyttarna fördelas över de egna passen. Pass utan skytt får
    // participant null (ledigt) och skyttar utan pass hamnar i unassigned.
    function assignPasses(participants, mode, customPasses = [], random = Math.random) {
        const shuffled = shuffleArray(participants, random);
        if (mode === 'advanced') {
            return {
                assignments: customPasses.map((pass, i) => ({
                    pass,
                    participant: i < shuffled.length ? shuffled[i] : null
                })),
                unassigned: shuffled.slice(customPasses.length)
            };
        }
        return {
            assignments: shuffled.map((participant, i) => ({ pass: `Pass ${i + 1}`, participant })),
            unassigned: []
        };
    }

    const api = { shuffleArray, assignPasses };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
