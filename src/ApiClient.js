const FLEET = [
    { id: "1", model: "Hyundai Santa Fe", make: "hyundai", apiModel: "santa fe", year: 2022, supplier: "Avis", pickup: "KGL", category: "suv",
        transmission: "automatic", seats: 5, dailyRate: 70, currency: "USD" },
    { id: "2", model: "Toyota Land Cruiser", make: "toyota", apiModel: "land cruiser", year: 2022, supplier: "Entreprise", pickup: "KGL", category: "suv", transmission: "manual", seats: 7, dailyRate: 34, currency: "USD"},
    { id: "3", model: "Hyundai Avante", make: "hyundai", apiModel: "elantra", year: 2022, supplier: "Sixt", pickup: "LHR", category: "sedan", transmission: "automatic", seats: 5, dailyRate: 52, currency: "USD" }    
];

const specCache = new Map();

function pickSpecs(s) {
    const num = (v) => (typeof v === "number" ? v : null);
    return {
        drive: s.drive || null,
        fuel: s.fuel_type || null,
        cylinders: num(s.cylinders),
        displacement: num(s.displacement),
        bodyClass: s.class || null 
    };
}

async function lookupSpecs(car, base, key, timeout) {
    const cacheKey = `${car.make}|${car.apiModel}|${car.year}`;
    if (specCache.has(cacheKey)) return specCache.get(cacheKey);

    const url = new URL("/v1/cars", base);
    url.searchParams.set("make", car.make);
    url.searchParams.set("model", car.apiModel);
    url.searchParams.set("year", String(car.year));

    const res = await fetch(url, {

        headers: { "X-Api-Key": key, Accept: "application/json" },
        signal: AbortSignal.timeout(timeout)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error(data?.error || "unexpected response");
    if (data.length === 0) throw new Error("no match");

    const specs = pickSpecs(data[0]);
    specCache.set(cacheKey, specs);
    return specs;
}

export async function fetchRentalCars() {
    const base = process.env.API_BASE_URL;
    const key = process.env.API_KEY;
    const timeout = Number(process.env.REQUEST_TIMEOUT_MS || 8000);

    if (!base || !key || key === "your_api_key_here"){
        return { source: "sample (no API key)", cars: FLEET.map((c) => ({
            ...c, specs:null })) };
    }

    let failed = 0;
    let firstError = "";
    const cars = await Promise.all(FLEET.map(async (car) =>{
        try {
            return { ...car, specs: await lookupSpecs(car, base, key, timeout) };
        } catch (e) {
            failed++;
            firstError ||= e.name === "TimeoutError" ? "timeout":
            e.message;
            return {...car, specs: null};
        }
    }));

    if (failed === 0) return {source: "api", cars};
    if (failed === cars.length) return { source: `fallback (${firstError})`, cars };
    return { source: `api (${cars.length - failed}/${cars.length} specs, ${firstError})`, cars };
}