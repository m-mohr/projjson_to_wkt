const Converter  = require('../src/index.js');
const fs = require('fs');
const path = require('path');

const folder = 'tests/assets';
let files = fs.readdirSync(folder)
    .filter(name => name.endsWith('.json'))
    .map(name => {
        const id = name.replace(/\.json$/, '');
        const filepath = path.join(folder, id);
        return [
            id,
            JSON.parse(fs.readFileSync(filepath + '.json', 'utf8')),
            fs.readFileSync(filepath + '.wkt1', 'utf8'),
            fs.readFileSync(filepath + '.wkt2', 'utf8')
        ];
    });

describe('PROJJSON => WKT1', () => {
    test.each(files)('%p', (id, projjson, expWkt1) => {
        const wkt1 = Converter.toWkt1(projjson);
        expect(wkt1).toBe(expWkt1);
    });
});

describe('PROJJSON => WKT2:2019', () => {
    test.each(files)('%p', (id, projjson, expWkt1, expWkt2) => {
        const wkt2 = Converter.toWkt2(projjson);
        expect(wkt2).toBe(expWkt2);
    });
});
