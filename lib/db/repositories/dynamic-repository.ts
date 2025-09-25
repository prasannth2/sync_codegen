import { Dynamic, DynamicRepository } from "@/lib/types/mapper";

const BASE_URL = "https://cpt4x27j-4000.inc1.devtunnels.ms/api";


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