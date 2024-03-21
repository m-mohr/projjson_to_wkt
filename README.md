projjson_to_wkt - JavaScript library to convert a PROJJSON string to WKT
====================================================================

Converts a [PROJJSON](https://proj.org/specifications/projjson.html) CRS
string into a [WKT CRS](https://www.ogc.org/standards/wkt-crs) string (WKT1
or WKT2:2019 variants supported).

This library is a single file with no dependency, that could be easily ported
to other languages.
This is ported from the original [Python version](https://github.com/rouault/projjson_to_wkt)
written by [Even Rouault](http://www.spatialys.com).
All credits go towards Even, all bugs are my fault...

Currently supported object types are: GeodeticCRS, GeographicCRS, ProjectedCRS,
VerticalCRS, CompoundCRS, DerivedGeodeticCRS and DerivedGeographicCRS.

## Usage

Add to your project:

```bash
npm install projjson-to-wkt
```

Add to your code:

```js
const Converter = require('projjson-to-wkt');

const projjson = {...};

// Converts to WKT2:2019, with indentation
const wkt2 = Converter.toWkt2(projjson);
// Converts to WKT1, with indentation
const wkt1 = Converter.toWkt1(projjson);
// Converts to WKT1, without indentation in a single line
const wkt1_plain = Converter.toWkt1(projjson, "");

// Alternatively...
const convert = new Converter(Converter.WKT1, "");
connvert.toWkt(projjson);
```

## License

MIT
