const mockLatLngs = [
    [{ lat: 47.1, lng: 5.1 }, { lat: 47.2, lng: 5.2 }],
    [{ lat: 47.3, lng: 5.3 }, { lat: 47.4, lng: 5.4 }]
];

const mockLatLngsSingle = [
    { lat: 47.1, lng: 5.1 }, { lat: 47.2, lng: 5.2 }
];

function testFlatten(latlngs) {
    let flatLatLngs = [];
    if (Array.isArray(latlngs) && latlngs.length > 0) {
        if (Array.isArray(latlngs[0])) {
            flatLatLngs = latlngs.flat(Infinity);
        } else {
            flatLatLngs = latlngs;
        }
    }
    console.log("Flattened length:", flatLatLngs.length);
}

try {
    testFlatten(mockLatLngs);
    testFlatten(mockLatLngsSingle);
    console.log("Flatten logic is OK.");
} catch (e) {
    console.error("Flatten logic FAILED:", e);
}
