import { Dynamic, DynamicRepository } from "@/lib/types/mapper";

const BASE_URL = process.env.API_BASE_URL;


export const dynamicApiRepository: DynamicRepository = {

    async selectApiById(path, id) {
        const res = await fetch(`${BASE_URL}/${path}/${id}`);
        if (!res.ok) throw new Error(`Failed to selectApiById: ${res.statusText}`);
        const json = await res.json();
        return json;
    },

    async selectApis( path, _, limit = 50) {
        const res = await fetch(`${BASE_URL}/${path}?limit=${limit}`);
        if (!res.ok) throw new Error(`Failed to selectApis: ${res.statusText}`);
        const json = await res.json();
        return json.data ?? [];
    },
};