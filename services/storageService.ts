import { kv } from '@vercel/kv';

const URLS_KEY = 'posted_promotion_urls';

// Pega a lista de URLs já postadas
export async function getPostedUrls(): Promise<string[]> {
    const urls = await kv.get<string[]>(URLS_KEY);
    return urls || [];
}

// Adiciona uma nova URL à lista
export async function addPostedUrl(url: string): Promise<void> {
    await kv.sadd(URLS_KEY, url);
}
