import http from "node:http";
import { fetchRentalCars } from "./src/ApiClient.js";
import { queryRentalCars } from "./src/Formatter.js";

const PORT = Number(process.env.PORT || 3000);
const SERVER_ID = process.env.SERVER_ID || "local-dev";

http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const headers = {"Content-Type": "application/json", "X-Served-By": SERVER_ID };
    if (url.pathname === "/health") return res.writeHead(200, headers).end(JSON.stringify({ ok: true, serverId: SERVER_ID }));
    if (url.pathname === "/cars"){
        const q = Object.fromEntries(url.searchParams);
        const { cars, source } = await fetchRentalCars(q);
        return res.writeHead(200, headers).end(JSON.stringify({ serverId: SERVER_ID, source, cars: queryRentalCars(cars, q) }));
    }
    res.writeHead(404, headers).end(JSON.stringify({ error: "Use /health or /cars" }))
}).listen(PORT, "0.0.0.0");