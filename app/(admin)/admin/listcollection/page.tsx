"use client"

import { CollectionSelector } from "@/components/admin/database/collection-selector";
import { DatabaseExplorer } from "@/components/admin/database/database-explorer";
import { useEffect, useState } from "react";
import { toast } from "sonner";


const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;


export default function HomePage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [collections, setCollections] = useState<string[]>([])
    const [selectedCollection, setSelectedCollection] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [total, setTotal] = useState(0)



    const loadCollections = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(`${API_BASE_URL}/mongo/api/collections`)
            if (response.ok) {
                const data = await response.json()
                setCollections(data)
            } else {
                // Demo collections if API is not available
                setCollections(["users", "products", "orders", "analytics", "logs"])
            }
        } catch (error) {
            // Demo collections if API is not available
            setCollections(["users", "products", "orders", "analytics", "logs"])
            toast("API Connection", {
                description: "Using demo data. Connect to live url for live data.",
            });
        } finally {
            setIsLoading(false)
        }
    }


    useEffect(() => {
        loadCollections()
    }, [])

    return (
        <div className="min-h-screen bg-background">
            <CollectionSelector
                collections={collections}
                selectedCollection={selectedCollection}
                onCollectionChange={setSelectedCollection}
                isLoading={isLoading}
                total={total}
            />

            <div className="py-2 px-2">
                <DatabaseExplorer selectedCollection={selectedCollection} setTotal={setTotal} total={total} />
            </div>


        </div>
    )
}
