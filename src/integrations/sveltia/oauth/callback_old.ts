import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async () => {
    return new Response(
        "OAuth callback not implemented yet.",
        {
            status: 501,
        },
    );
};