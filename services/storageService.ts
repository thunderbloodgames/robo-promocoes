import { kv } from '@vercel/kv';

// Nome do "caderno" exclusivo para este robô.
const URLS_KEY = 'promocoes_posted_urls';

// Pega a lista de URLs já postadas deste caderno
export async function getPostedUrls(): Promise<string[]> {
    const urls = await kv.get<string[]>(URLS_KEY);
    return urls || [];
}

// Adiciona uma nova URL a este caderno
export async function addPostedUrl(url: string): Promise<void> {
    await kv.sadd(URLS_KEY, url);
}
