export function queryRentalCars(cars, { pickup = "", query = "", category = "", transmission = "", maxPrice = "", sort = "price" } = {}){
    const max = Number(maxPrice) > 0 ? Number(maxPrice) : Infinity;
    return cars
    .filter((c) => {
        if (pickup && String(c.pickup || "").toUpperCase() !== pickup.toUpperCase()) return false;
        if (category && String(c.category || "").toLowerCase() !== category.toLowerCase()) return false;
        if (transmission && String(c.transmission || "").toLowerCase() !== transmission.toLowerCase()) return false;
        if (Number(c.dailyRate ?? 0) > max) return false;
        if (query && ! `${c.model || ""} ${c.supplier || ""} ${c.pickup || ""}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
    })
    .sort((a,b) => (sort === "price-desc" ? Number(b.dailyRate ?? 0) - Number(a.dailyRate ?? 0) : Number(a.dailyRate ?? 0) - Number(b.dailyRate ?? 0)));
}

function engineText(specs){
    if (!specs || (!specs.cylinders && !specs.displacement)) return "-";
    const cyl = specs.cylinders ? `${specs.cylinders} cyl` : "";
    const size =  specs.displacement ? `${specs.displacement}L` : "";
    return [cyl, size].filter(Boolean).join(" ");
}

export function renderTerminalTable(cars, meta = {}){
    if (cars.length=== 0) {
        console.log("No cars match your research. Try fewer filters.");
    } else {
        console.table(cars.map((c) =>({
            Model: c.model,
            Supplier: c.supplier,
            Pickup: c.pickup,
            Category: c.category,
            Gear: c.transmission,
            Drive: c.specs?.drive?.toUpperCase() || "-",
            Fuel: c.specs?.fuel || "-",
            Engine: engineText(c.specs),
            Rate: `${c.currency || "USD"} ${c.dailyRate}/d`
        })));
    }
    console.log(`Server: ${meta.serverId || "local"} | Source: ${meta.source || "unknown"}`);
}