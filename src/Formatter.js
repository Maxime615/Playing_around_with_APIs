export function queryRentalCars(cars, { pickup = "", query = "", category = "", transmission = "", maxPrice = "", sort = "price" } = {}){
    const max = Number(maxPrice) > 0 ? Number(maxPrice) : Infinity;
    return cars  
    .filter((c) => {
        if (pickup && String(c.pickup || "").toUpperCase() !== pickup.toUpperCase()) return false;
        if (category && String(c.category || "").toLowerCase() !== category.toLowerCase()) return false;
        if (transmission && String(c.transmission || "").toLowerCase() !== transmission.toLowerCase()) return false;
        if (Number(c.dailyRate ?? 0) > max) return false;
        if (query && !`${c.model || ""} ${c.supplier || ""} ${c.pickup || ""}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
    })
    .sort((a,b) => (sort === "price-desc" ? Number(b.dailyRate ?? 0) - Number(a.dailyRate ?? 0) : Number(a.dailyRate ?? 0) - Number(b.dailyRate ?? 0)));
}

export function renderTerminalTable(cars, meta = {}){
    console.table(cars.map((c) =>({
        Model: c.model,
        Supplier: c.supplier,
        Pickup: c.pickup,
        Category: c.category,
        Gear: c.transmission,
        Rate: `${c.currency || "USD"} ${c.dailyRate}/d`
    })));
    console.log(`Server: ${meta.serverId || "local"} | Source: ${meta.source || "unknown"}`);
}