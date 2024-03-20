const { toWkt, WKT1 }  = require('../index.js');

test('Geographic CRS EPSG:4326', () => {
    const projjson = {"$schema": "https://proj.org/schemas/v0.4/projjson.schema.json", "type": "GeographicCRS", "name": "WGS 84", "datum_ensemble": {"name": "World Geodetic System 1984 ensemble", "members": [{"name": "World Geodetic System 1984 (Transit)", "id": {"authority": "EPSG", "code": 1166}}, {"name": "World Geodetic System 1984 (G730)", "id": {"authority": "EPSG", "code": 1152}}, {"name": "World Geodetic System 1984 (G873)", "id": {"authority": "EPSG", "code": 1153}}, {"name": "World Geodetic System 1984 (G1150)", "id": {"authority": "EPSG", "code": 1154}}, {"name": "World Geodetic System 1984 (G1674)", "id": {"authority": "EPSG", "code": 1155}}, {"name": "World Geodetic System 1984 (G1762)", "id": {"authority": "EPSG", "code": 1156}}, {
    "name": "World Geodetic System 1984 (G2139)", "id": {"authority": "EPSG", "code": 1309}}], "ellipsoid": {"name": "WGS 84", "semi_major_axis": 6378137, "inverse_flattening": 298.257223563}, "accuracy": "2.0", "id": {"authority": "EPSG", "code": 6326}}, "coordinate_system": {"subtype": "ellipsoidal", "axis": [{"name": "Geodetic latitude", "abbreviation": "Lat", "direction": "north", "unit": "degree"}, {"name": "Geodetic longitude", "abbreviation": "Lon", "direction": "east", "unit": "degree"}]}, "scope": "Horizontal component of 3D system.", "area": "World.", "bbox": {"south_latitude": -90, "west_longitude": -180, "north_latitude": 90, "east_longitude": 180}, "id": {"authority": "EPSG", "code": 4326}};
    let wkt = toWkt(projjson);
    expect(wkt).toBe(`GEOGCRS["WGS 84",
    ENSEMBLE["World Geodetic System 1984 ensemble",
        MEMBER["World Geodetic System 1984 (Transit)",
            ID["EPSG",1166]],
        MEMBER["World Geodetic System 1984 (G730)",
            ID["EPSG",1152]],
        MEMBER["World Geodetic System 1984 (G873)",
            ID["EPSG",1153]],
        MEMBER["World Geodetic System 1984 (G1150)",
            ID["EPSG",1154]],
        MEMBER["World Geodetic System 1984 (G1674)",
            ID["EPSG",1155]],
        MEMBER["World Geodetic System 1984 (G1762)",
            ID["EPSG",1156]],
        MEMBER["World Geodetic System 1984 (G2139)",
            ID["EPSG",1309]],
        ELLIPSOID["WGS 84",6378137,298.257223563,
            LENGTHUNIT["metre",1]],
        ENSEMBLEACCURACY[2.0],
        ID["EPSG",6326]],
    CS[ellipsoidal,2],
        AXIS["geodetic latitude (Lat)",north,
            ANGLEUNIT["degree",0.0174532925199433]],
        AXIS["geodetic longitude (Lon)",east,
            ANGLEUNIT["degree",0.0174532925199433]],
    USAGE[
        SCOPE["Horizontal component of 3D system."],
        AREA["World."],
        BBOX[-90,-180,90,180]],
    ID["EPSG",4326]]`);

    wkt = toWkt(projjson, WKT1);
    expect(wkt).toBe(`GEOGCS["WGS 84",
    DATUM["World Geodetic System 1984",
        SPHEROID["WGS 84",6378137,298.257223563],
        AUTHORITY["EPSG","6326"]],
    PRIMEM["Greenwich",0],
    UNIT["degree",0.0174532925199433],
    AXIS["Geodetic latitude (Lat)",NORTH],
    AXIS["Geodetic longitude (Lon)",EAST],
    AUTHORITY["EPSG","4326"]]`);
});
