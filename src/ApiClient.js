const FALLBACK_CARS = [
    { id: "1", model: "Hyundai Santa fe", supplier: "Avis", pickup: "KGL", category: "suv", transmission: "automatic", seats: 5, dailyRate: 70, currency: "USD"},
    { id: "2", model: "Toyota Land Cruiser", supplier: "Entreprise", pickup: "KGL", category: "suv", transmission: "manual", seats: 7, dailyRate: 34, currency: "USD"},
    { id: "3", model: "Hyundai Avante", supplier: "Sixt", pickup: "LHR", category: "sedan", transmission: "automatic", seats: 5, dailyRate: 52, currency: "USD", }
];

function toIsoDateTime(val, fallback){
    if (!val) return fallback;
    return val.includes("T") ? val : `${val}T10:00:00`;
}

export async function fetchRentalCars({ pickup = "", from = "", to = "", driverAge = 32} = {}){
    const base = process.env.API_BASE_URL;
    const key = process.env.API_KEY;
    const secret = process.env.API_SECRET;
    const timeout = Number(process.env.REQUEST_TIMEOUT_MS || 8000);
    if (!base || !key  || !secret || key === "your_api_key_here") return { source: "sample", cars: FALLBACK_CARS};

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try{
       const endpoint = `${base.replace(/\/+$/, "")}/car/v0/search`;
       const body = {
        pickup_location: (pickup || "LHR").toUpperCase(),
        pickup_at: toIsoDateTime(from, "2026-12-20T10:00:00"),
        dropoff_at: toIsoDateTime(to, "2026-12-27T10:00:00"),
        driver_age: Number(process.env.DRIVER_AGE || driverAge || 32)
       };

       const res = await fetch(endpoint, {
        method: "POST",
        headers: {
            "X-Api-Key": key,
            "X-Api-Secret": secret,
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify(body),
        signal: ctrl.signal
       });

       if (!res.ok) throw new Error(`HTTP ${res.status}`);
       const data = await res.json();
       const list = data.cars ?? data.data ?? data.results ?? [];
       return { source: "api", cars: Array.isArray(list) ? list : FALLBACK_CARS };
    } catch (e){
        return{ source: `fallback (${e.message})`, cars: FALLBACK_CARS };
    } finally {
        clearTimeout(timer);
    }
}