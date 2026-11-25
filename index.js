#!/usr/bin/env node
import { parseArgs } from "node:util";
import { fetchRentalCars } from "./src/ApiClient.js";
import { queryRentalCars, renderTerminalTable } from "./src/Formatter.js";

const { values } = parseArgs({
    options: {
        pickup: { type: "string", default: "" },
        from: { type: "string", default: "" },
        to: { type: "string", default: "" },
        "driver-age" : { type: "string", default: "" },
        query: { type: "string", default: "" },
        category: { type: "string", default: "" },
        transmission: { type: "string", default: "" },
        "max-price": { type: "string", default: "" },
        sort: { type: "string", default: "price" }
    },
    allowPositionals: false
});

const { cars, source } = await fetchRentalCars({
    ...values,
    driverAge: values["driver-age"] || 32
});
const results = queryRentalCars(cars, { ...values, maxPrice: values["max-price"] });
renderTerminalTable(results, { serverId: process.env.SERVER_ID, source });