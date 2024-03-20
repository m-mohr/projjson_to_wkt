const DEG_TO_RAD = 0.0174532925199433;

/**
 * Converter to transform PROJJSON to WKT1 or WKT2:2019.
 */
class ProjJsonConverter {

    /**
     * WKT1
     * @type {string}
     */
    static WKT1 = "WKT1";
    /**
     * WKT2:2019
     * @type {string}
     */
    static WKT2_2019 = "WKT2:2019";

    /**
     * Create a new Converter instance.
     * 
     * @param {string} format The WKT format to use, either ProjJsonConverter.WKT1 or ProjJsonConverter.WKT2_2019.
     * @param {string} lineSep Line separator (default: \r\n), also enables indentation. Use an empty string to disable indentation and line breaks.
     */
    constructor(format = ProjJsonConverter.WKT2_2019, lineSep = "\r\n") {
        if (![ProjJsonConverter.WKT1, ProjJsonConverter.WKT2_2019].includes(format)) {
            throw new Error("Unsupported WKT format");
        }
        this.format = format;
        this.lineSep = lineSep;
        this.indentationByLevel = lineSep.length === 0 ? "" : "    ";
        this.wkt = "";
        this.stackHasValues = [];
        this.indentation = "";
    }

    quoteStr(x) {
        return "\"" + x.replace(/"/g, "\"\"") + "\"";
    }

    floatToStr(v) {
        return Number(v).toPrecision(15).replace(/(?:\.0+|(\.\d+?)0+)$/, "$1");
    }

    
    getValueUnit(v, defaultUnit) {
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            const val = v.value;
            let unit = v.unit;
            if (unit === "metre") {
                return [val, unit, 1.0];
            } else if (unit === "degree") {
                return [val, unit, DEG_TO_RAD];
            }
            const convFactor = v.conversion_factor;
            return [val, v.name, convFactor];
        }
        return [v, defaultUnit, (defaultUnit === "degree" ? DEG_TO_RAD : 1.0)];
    }

    startNode(name) {
        if (this.stackHasValues.length > 0) {
            if (this.stackHasValues[this.stackHasValues.length - 1]) {
                this.wkt += ",";
            } else {
                this.stackHasValues[this.stackHasValues.length - 1] = true;
            }
            this.wkt += this.lineSep;
        }
        this.wkt += this.indentation;
        this.wkt += name;
        this.wkt += "[";
        this.stackHasValues.push(false);
        this.indentation += this.indentationByLevel;
    }
    
    endNode() {
        this.wkt += "]";
        this.endPseudoNode();
    }

    startPseudoNode() {
        this.stackHasValues.push(true);
        this.indentation += this.indentationByLevel;
    }
    
    endPseudoNode() {
        this.stackHasValues.pop();
        this.indentation = this.indentation.substring(0, this.indentation.length - this.indentationByLevel.length);
    }
    
    addQuotedString(s) {
        if (this.stackHasValues[this.stackHasValues.length - 1]) {
            this.wkt += ",";
        }
        this.wkt += this.quoteStr(s);
        this.stackHasValues[this.stackHasValues.length - 1] = true;
    }
    
    add(s) {
        if (this.stackHasValues[this.stackHasValues.length - 1]) {
            this.wkt += ",";
        }
        this.wkt += s;
        this.stackHasValues[this.stackHasValues.length - 1] = true;
    }

    idToWkt(id) {
        if (this.format === ProjJsonConverter.WKT1) {
            this.startNode("AUTHORITY");
            this.addQuotedString(id["authority"]);
            const code = id["code"];
            this.addQuotedString(String(code));
            this.endNode();
        } else {
            this.startNode("ID");
            this.addQuotedString(id["authority"]);
            const code = id["code"];
            if (typeof code === 'number') {
                this.add(String(code));
            } else {
                this.addQuotedString(code);
            }
            this.endNode();
        }
    }

    objectUsageToWkt(obj) {
        if (this.format !== ProjJsonConverter.WKT1) {
            const scope = obj.scope !== undefined ? obj.scope : null;
            const area = obj.area !== undefined ? obj.area : null;
            const bbox = obj.bbox !== undefined ? obj.bbox : null;
            if (scope || area || bbox) {
                this.startNode("USAGE");
                if (scope) {
                    this.startNode("SCOPE");
                    this.addQuotedString(scope);
                    this.endNode();
                }
                if (area) {
                    this.startNode("AREA");
                    this.addQuotedString(area);
                    this.endNode();
                }
                if (bbox) {
                    this.startNode("BBOX");
                    this.add(this.floatToStr(bbox.south_latitude));
                    this.add(this.floatToStr(bbox.west_longitude));
                    this.add(this.floatToStr(bbox.north_latitude));
                    this.add(this.floatToStr(bbox.east_longitude));
                    this.endNode();
                }
                this.endNode();
            } else {
                const usages = obj.usages !== undefined ? obj.usages : null;
                if (usages) {
                    usages.forEach(usage => this.objectUsageToWkt(usage));
                }
            }
        }
    
        let id = obj.id !== undefined ? obj.id : null;
        if (id) {
            this.idToWkt(id);
        } else if (this.format !== ProjJsonConverter.WKT1) {
            const ids = obj.ids !== undefined ? obj.ids : null;
            if (ids) {
                ids.forEach(id => this.idToWkt(id));
            }
        }
    
        if (this.format !== ProjJsonConverter.WKT1) {
            const remarks = obj.remarks !== undefined ? obj.remarks : null;
            if (remarks) {
                this.startNode("REMARK");
                this.addQuotedString(remarks);
                this.endNode();
            }
        }
    }

    ellipsoidToWkt(ellipsoid) {
        this.startNode(this.format === ProjJsonConverter.WKT1 ? "SPHEROID" : "ELLIPSOID");
        this.addQuotedString(ellipsoid.name);
        const semiMajorAxis = ellipsoid.semi_major_axis;
        let [a, unit, convFactor] = this.getValueUnit(semiMajorAxis, "metre");
        this.add(this.floatToStr(a));
    
        const semiMinorAxis = ellipsoid.semi_minor_axis !== undefined ? ellipsoid.semi_minor_axis : null;
        const inverseFlattening = ellipsoid.inverse_flattening !== undefined ? ellipsoid.inverse_flattening : null;
        if (inverseFlattening) {
            let [rf, unit2, convFactor2] = this.getValueUnit(inverseFlattening, null);
            this.add(this.floatToStr(rf));
        } else if (semiMinorAxis) {
            let [b, unit2, convFactor2] = this.getValueUnit(semiMinorAxis, "metre");
            if (unit !== unit2 || convFactor !== convFactor2) {
                throw new Error(`Unit or conversion factor mismatch: ${unit} vs ${unit2}`);
            }
            let rf = a / (a - b);
            this.add(this.floatToStr(rf));
        } else {
            throw new Error("semi_minor_axis or inverse_flattening missing in ellipsoid");
        }
    
        if (convFactor !== 1 && this.format === ProjJsonConverter.WKT1) {
            throw new Error('conv_factor != 1 unsupported for WKT1');
        }
        if (this.format !== ProjJsonConverter.WKT1) {
            this.startNode("LENGTHUNIT");
            this.addQuotedString(unit);
            this.add(this.floatToStr(convFactor));
            this.endNode();
        }
        this.objectUsageToWkt(ellipsoid);
        this.endNode();
    }

    primeMeridianToWkt(pm) {
        this.startNode("PRIMEM");
        this.addQuotedString(pm.name);
        let longitude = pm.longitude;
        let unit, convFactor;
        [longitude, unit, convFactor] = this.getValueUnit(longitude, "degree");
        this.add(this.floatToStr(longitude));
        if (this.format !== ProjJsonConverter.WKT1) {
            this.unitToWkt({
                type: "AngularUnit",
                name: unit,
                conversion_factor: convFactor
            });
        }
        this.objectUsageToWkt(pm);
        this.endNode();
    }
    
    datumToWkt(datum) {
        if (this.format !== ProjJsonConverter.WKT1) {
            const type = datum.type !== undefined ? datum.type : null;
            if (type && type === "DynamicGeodeticReferenceFrame") {
                this.startNode("DYNAMIC");
                this.startNode("FRAMEEPOCH");
                this.add(String(datum.frame_reference_epoch));
                this.endNode();
                this.endNode();
            }
        }
        this.startNode("DATUM");
        this.addQuotedString(datum.name);
        this.ellipsoidToWkt(datum.ellipsoid);
        this.objectUsageToWkt(datum);
        this.endNode();
    }

    ensembleMemberToWkt(member) {
        this.startNode("MEMBER");
        this.addQuotedString(member.name);
        this.objectUsageToWkt(member);
        this.endNode();
    }
    
    datumEnsembleToWkt(ensemble) {
        if (this.format === ProjJsonConverter.WKT1) {
            this.startNode("DATUM");
            this.addQuotedString(ensemble.name.replace(" ensemble", ""));
            this.ellipsoidToWkt(ensemble.ellipsoid);
            this.objectUsageToWkt(ensemble);
            this.endNode();
        } else {
            this.startNode("ENSEMBLE");
            this.addQuotedString(ensemble.name);
            const members = ensemble.members;
            members.forEach(member => {
                this.ensembleMemberToWkt(member);
            });
            this.ellipsoidToWkt(ensemble.ellipsoid);
            const accuracy = ensemble.accuracy !== undefined ? ensemble.accuracy : null;
            if (accuracy) {
                this.startNode("ENSEMBLEACCURACY");
                this.add(accuracy);
                this.endNode();
            }
            this.objectUsageToWkt(ensemble);
            this.endNode();
        }
    }

    unitToWkt(unit) {
        if (unit === "degree") {
            unit = { name: "degree", conversion_factor: DEG_TO_RAD, type: "AngularUnit" };
        } else if (unit === "metre") {
            unit = { name: "metre", conversion_factor: 1.0, type: "LinearUnit" };
        } else if (unit === "unity") {
            unit = { name: "unity", conversion_factor: 1.0, type: "ScaleUnit" };
        }
    
        const type = unit.type;
        const name = unit.name;
        const convFactor = unit.conversion_factor;
        let keyword;
        if (this.format === ProjJsonConverter.WKT1) {
            keyword = "UNIT";
        } else if (type === "AngularUnit") {
            keyword = "ANGLEUNIT";
        } else if (type === "LinearUnit") {
            keyword = "LENGTHUNIT";
        } else if (type === "ScaleUnit") {
            keyword = "SCALEUNIT";
        } else if (type === "TimeUnit") {
            keyword = "TIMEUNIT";
        } else if (type === "ParametricUnit") {
            keyword = "PARAMETRICUNIT";
        } else if (type === "Unit") {
            keyword = "UNIT";
        } else {
            throw new Error("unexpected unit type");
        }
        this.startNode(keyword);
        this.addQuotedString(name);
        this.add(this.floatToStr(convFactor));
        this.objectUsageToWkt(unit);
        this.endNode();
    }

    meridianToWkt(pm) {
        this.startNode("MERIDIAN");
        let longitude = pm.longitude;
        [longitude, unit, convFactor] = this.getValueUnit(longitude, "degree");
        this.add(this.floatToStr(longitude));
        if (this.format !== ProjJsonConverter.WKT1) {
            this.unitToWkt({ type: "AngularUnit", name: unit, conversion_factor: convFactor });
        }
        this.objectUsageToWkt(pm);
        this.endNode();
    }
    
    axisToWkt(axis) {
        this.startNode("AXIS");
        let name = axis.name;
        if (this.format !== ProjJsonConverter.WKT1) {
            name = name[0].toLowerCase() + name.slice(1);
        }
        this.addQuotedString(`${name} (${axis.abbreviation})`);
        let direction = axis.direction;
        if (this.format !== ProjJsonConverter.WKT1) {
            this.add(direction);
        } else {
            direction = direction.toUpperCase();
            if (!['EAST', 'NORTH', 'WEST', 'SOUTH', 'UP', 'DOWN'].includes(direction)) {
                direction = 'OTHER';
            }
            this.add(direction);
        }
        const meridian = axis.meridian;
        if (meridian && this.format !== ProjJsonConverter.WKT1) {
            this.meridianToWkt(meridian);
        }
        if (this.format !== ProjJsonConverter.WKT1) {
            this.unitToWkt(axis.unit);
        }
        this.endNode();
    }

    coordinateSystemToWkt(cs) {
        if (this.format !== ProjJsonConverter.WKT1) {
            this.startNode("CS");
            this.add(cs.subtype);
        }
        const axisList = cs.axis;
        if (this.format !== ProjJsonConverter.WKT1) {
            this.add(String(axisList.length));
            this.endNode();
            this.startPseudoNode();
        } else {
            this.unitToWkt(axisList[0].unit);
        }
        for (let axis of axisList) {
            this.axisToWkt(axis);
        }
        if (this.format !== ProjJsonConverter.WKT1) {
            this.endPseudoNode();
        }
    }

    geodeticCrsToWkt(crs, keyword = null, emitCs = true) {
        if (keyword === null) {
            const type = crs.type;
            if (this.format === ProjJsonConverter.WKT1) {
                keyword = type === "GeographicCRS" ? "GEOGCS" : "GEOCCS";
            } else {
                keyword = type === "GeographicCRS" ? "GEOGCRS" : "GEODCRS";
            }
        }
        this.startNode(keyword);
        this.addQuotedString(crs.name);
        const datum = crs.datum !== undefined ? crs.datum : null;
        if (datum) {
            this.datumToWkt(datum);
            const pm = datum.prime_meridian !== undefined ? datum.prime_meridian : null;
            if (pm) {
                this.primeMeridianToWkt(pm);
            } else if (this.format === ProjJsonConverter.WKT1) {
                this.primeMeridianToWkt({ name: "Greenwich", longitude: 0 });
            }
        } else {
            const datumEnsemble = crs.datum_ensemble;
            this.datumEnsembleToWkt(datumEnsemble);
            if (this.format === ProjJsonConverter.WKT1) {
                this.primeMeridianToWkt({ name: "Greenwich", longitude: 0 });
            }
        }
        if (emitCs) {
            this.coordinateSystemToWkt(crs.coordinate_system);
        }
        this.objectUsageToWkt(crs);
        this.endNode();
    }

    derivedGeodeticCrsToWkt(crs) {
        if (this.format === ProjJsonConverter.WKT1) {
            throw new Error(`${crs.type} unsupported in WKT1`);
        }
    
        this.startNode("GEODCRS");
        this.addQuotedString(crs.name);
        const baseCrs = crs.base_crs;
        const baseKeyword = baseCrs.type === "GeographicCRS" ? "BASEGEOGCRS" : "BASEGEODCRS";
        this.geodeticCrsToWkt(baseCrs, baseKeyword, false);
        this.conversionToWkt(crs.conversion, "DERIVINGCONVERSION");
        this.coordinateSystemToWkt(crs.coordinate_system);
        this.objectUsageToWkt(crs);
        this.endNode();
    }
    
    methodToWkt(method) {
        this.startNode("METHOD");
        this.addQuotedString(method.name);
        this.objectUsageToWkt(method);
        this.endNode();
    }

    parameterToWkt(parameter) {
        const value = parameter.value;
        if (typeof value === 'string') {
            this.startNode("PARAMETERFILE");
            this.addQuotedString(parameter.name);
            this.addQuotedString(value);
            this.objectUsageToWkt(parameter);
            this.endNode();
        } else {
            this.startNode("PARAMETER");
            this.addQuotedString(parameter.name);
            this.add(this.floatToStr(value));
            if (this.format !== ProjJsonConverter.WKT1) {
                this.unitToWkt(parameter.unit);
                this.objectUsageToWkt(parameter);
            }
            this.endNode();
        }
    }
    
    conversionToWkt(conversion, keyword = "CONVERSION") {
        if (this.format !== ProjJsonConverter.WKT1) {
            this.startNode(keyword);
            this.addQuotedString(conversion.name);
            this.methodToWkt(conversion.method);
            const parameters = conversion.parameters !== undefined ? conversion.parameters : null;
            if (parameters) {
                parameters.forEach(parameter => {
                    this.parameterToWkt(parameter);
                });
            }
            this.objectUsageToWkt(conversion);
            this.endNode();
        } else {
            this.startNode("PROJECTION");
            this.addQuotedString(conversion.method.name);
            this.endNode();
            const parameters = conversion.parameters !== undefined ? conversion.parameters : null;
            if (parameters) {
                parameters.forEach(parameter => {
                    this.parameterToWkt(parameter);
                });
            }
        }
    }

    projectedCrsToWkt(crs) {
        let isWkt1 = this.format === ProjJsonConverter.WKT1;
        this.startNode(!isWkt1 ? "PROJCRS" : "PROJCS");
        this.addQuotedString(crs.name);
        const baseCrs = crs.base_crs;
        const baseKeyword = baseCrs.coordinate_system.subtype === "ellipsoidal"
            ? !isWkt1 ? "BASEGEOGCRS" : "GEOGCS"
            : !isWkt1 ? "BASEGEODCRS" : "GEOCCS";
        this.geodeticCrsToWkt(baseCrs, baseKeyword, isWkt1);
        this.conversionToWkt(crs.conversion);
        this.coordinateSystemToWkt(crs.coordinate_system);
        this.objectUsageToWkt(crs);
        this.endNode();
    }
    
    verticalDatumToWkt(datum) {
        if (this.format !== ProjJsonConverter.WKT1) {
            const type = datum.type !== undefined ? datum.type : null;
            if (type && type === "DynamicVerticalReferenceFrame") {
                this.startNode("DYNAMIC");
                this.startNode("FRAMEEPOCH");
                this.add(String(datum.frame_reference_epoch));
                this.endNode();
                this.endNode();
            }
        }
    
        this.startNode(this.format !== ProjJsonConverter.WKT1 ? "VDATUM" : "VERT_DATUM");
        this.addQuotedString(datum.name);
        if (this.format === ProjJsonConverter.WKT1) {
            this.add("2005");
        }
        this.objectUsageToWkt(datum);
        this.endNode();
    }

    verticalDatumEnsembleToWkt(ensemble) {
        if (this.format === ProjJsonConverter.WKT1) {
            this.startNode("VERT_DATUM");
            this.addQuotedString(ensemble.name);
            this.add("2005");
            this.objectUsageToWkt(ensemble);
            this.endNode();
        } else {
            this.startNode("ENSEMBLE");
            this.addQuotedString(ensemble.name);
            const members = ensemble.members;
            members.forEach(member => {
                this.ensembleMemberToWkt(member);
            });
            const accuracy = ensemble.accuracy !== undefined ? ensemble.accuracy : null;
            if (accuracy) {
                this.startNode("ENSEMBLEACCURACY");
                this.add(accuracy);
                this.endNode();
            }
            this.objectUsageToWkt(ensemble);
            this.endNode();
        }
    }
    
    verticalCrsToWkt(crs) {
        this.startNode(this.format !== ProjJsonConverter.WKT1 ? "VERTCRS" : "VERT_CS");
        this.addQuotedString(crs.name);
        const datum = crs.datum !== undefined ? crs.datum : null;
        if (datum) {
            this.verticalDatumToWkt(datum);
        } else {
            const datumEnsemble = crs.datum_ensemble;
            this.verticalDatumEnsembleToWkt(datumEnsemble);
        }
        this.coordinateSystemToWkt(crs.coordinate_system);
        this.objectUsageToWkt(crs);
        this.endNode();
    }

    compoundCrsToWkt(crs) {
        this.startNode(this.format !== ProjJsonConverter.WKT1 ? "COMPOUNDCRS" : "COMPD_CS");
        this.addQuotedString(crs.name);
        const components = crs.components;
        components.forEach(component => {
            this.toWkt(component);
        });
        this.objectUsageToWkt(crs);
        this.endNode();
    }
    
    abridgedTransformationToWkt(transf) {
        this.startNode("ABRIDGEDTRANSFORMATION");
        this.addQuotedString(transf.name);
        this.methodToWkt(transf.method);
        const parameters = transf.parameters;
        parameters.forEach(parameter => {
            this.parameterToWkt(parameter);
        });
        this.objectUsageToWkt(transf);
        this.endNode();
    }
    
    boundCrsToWkt(crs) {
        if (this.format === ProjJsonConverter.ProjJsonConverter.WKT1) {
            throw new Error("BoundCRS unsupported in WKT1");
        }
    
        this.startNode("BOUNDCRS");
        this.startNode("SOURCECRS");
        this.toWkt(crs.source_crs);
        this.endNode();
        this.startNode("TARGETCRS");
        this.toWkt(crs.target_crs);
        this.endNode();
        this.abridgedTransformationToWkt(crs.transformation);
        this.endNode();
    }

    /**
     * Converts to the WKT representation.
     * 
     * @param {object} projjson PROJJSON object to convert.
     * @returns {string} WKT string
     */
    toWkt(projjson) {
        const type = projjson.type;
        if (["GeodeticCRS", "GeographicCRS"].includes(type)) {
            this.geodeticCrsToWkt(projjson);
        } else if (["DerivedGeodeticCRS", "DerivedGeographicCRS"].includes(type)) {
            this.derivedGeodeticCrsToWkt(projjson);
        } else if (type === "ProjectedCRS") {
            this.projectedCrsToWkt(projjson);
        } else if (type === "VerticalCRS") {
            this.verticalCrsToWkt(projjson);
        } else if (type === "CompoundCRS") {
            this.compoundCrsToWkt(projjson);
        } else if (type === "BoundCRS") {
            this.boundCrsToWkt(projjson);
        } else {
            throw new Error(`Unsupported object type: ${type}`);
        }
    
        return this.wkt;
    }

    /**
     * Convert PROJJSON to WKT1.
     * 
     * @param {object} projjson PROJJSON object to convert.
     * @param {string} lineSep Line separator (default: \r\n), also enables indentation. Use an empty string to disable indentation and line breaks.
     * @returns {string} WKT1 string
     */
    static toWkt1(projjson, lineSep = "\r\n") {
        const converter = new ProjJsonConverter(ProjJsonConverter.WKT1, lineSep);
        return converter.toWkt(projjson);
    }

    /**
     * Convert PROJJSON to WKT2:2019.
     * 
     * @param {object} projjson PROJJSON object to convert.
     * @param {string} lineSep Line separator (default: \r\n), also enables indentation. Use an empty string to disable indentation and line breaks.
     * @returns {string} WKT2:2019 string
     */
    static toWkt2(projjson, lineSep = "\r\n") {
        const converter = new ProjJsonConverter(ProjJsonConverter.WKT2_2019, lineSep);
        return converter.toWkt(projjson);
    }

}

module.exports = ProjJsonConverter;