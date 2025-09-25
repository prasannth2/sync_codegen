import { dynamicRepository } from "@/lib/db/repository";

export async function GET(
    _request: Request,
    ctx: { params: Promise<{ id: string }> },
) {

    const { id } = await ctx.params;


    const api = await dynamicRepository.selectApiById("formatters", id);
    if (!api) return new Response("Not Found", { status: 404 });

    return Response.json(api);
}