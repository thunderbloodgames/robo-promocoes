import { kv } from '@vercel/kv';

// Interfaces para organizar os dados do Mercado Livre
interface MercadoLivreOffer {
    store: 'Mercado Livre';
    title: string;
    url: string; // Este já será nosso link de afiliado
    imageUrl: string;
    price: string;
    originalPrice?: string;
}

interface MeliToken {
    access_token: string;
    expires_in: number;
    created_at: number;
}

// Função para obter o Token de Acesso (gerencia a autenticação)
async function getMercadoLivreToken(): Promise<string | null> {
    const appId = process.env.MERCADO_LIVRE_APP_ID;
    const clientSecret = process.env.MERCADO_LIVRE_CLIENT_SECRET;

    if (!appId || !clientSecret) {
        console.error("Credenciais do Mercado Livre não configuradas.");
        return null;
    }

    let tokenData = await kv.get<MeliToken>('mercadolivre_token');

    if (tokenData && (Date.now() / 1000) < (tokenData.created_at + tokenData.expires_in - 300)) {
        return tokenData.access_token;
    }

    console.log("Gerando novo token de acesso do Mercado Livre...");
    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        body: `grant_type=client_credentials&client_id=${appId}&client_secret=${clientSecret}`
    });

    if (!response.ok) {
        console.error(`Falha ao obter token do Mercado Livre: ${await response.text()}`);
        return null;
    }

    const newAccessToken = await response.json();
    const newTokenData: MeliToken = {
        access_token: newAccessToken.access_token,
        expires_in: newAccessToken.expires_in,
        created_at: Math.floor(Date.now() / 1000)
    };
    await kv.set('mercadolivre_token', newTokenData);
    
    return newTokenData.access_token;
}

// Função principal que busca uma oferta no Mercado Livre
export async function encontrarOfertaMercadoLivre(urlsJaPostadas: string[]): Promise<MercadoLivreOffer | null> {
    console.log("Buscando ofertas no Mercado Livre...");
    const seuAffiliateId = 'kngnewstore'; // Sua etiqueta de afiliado

    try {
        const accessToken = await getMercadoLivreToken();
        if (!accessToken) return null;

        const offersResponse = await fetch('https://api.mercadolibre.com/sites/MLB/deals/search', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!offersResponse.ok) {
            console.error("ML: Erro ao buscar lista de ofertas.");
            return null;
        }

        const offersData = await offersResponse.json();
        const offerIds = offersData.results.map((item: any) => item.id).join(',');

        const itemsResponse = await fetch(`https://api.mercadolibre.com/items?ids=${offerIds}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        const itemsData = await itemsResponse.json();
        const novoItem = itemsData.find((item: any) => item.code === 200 && !urlsJaPostadas.includes(item.body.permalink));
        
        if (!novoItem) {
            console.log("ML: Nenhuma oferta nova encontrada.");
            return null;
        }

        const produto = novoItem.body;
        const linkAfiliado = `${produto.permalink}?mpreid=${seuAffiliateId}`;
        
        console.log(`ML: Oferta encontrada - ${produto.title}`);
        return {
            store: 'Mercado Livre',
            title: produto.title,
            url: linkAfiliado,
            imageUrl: produto.thumbnail.replace(/^http:/, 'https:'),
            price: `R$ ${produto.price.toFixed(2).replace('.', ',')}`,
            originalPrice: produto.original_price ? `R$ ${produto.original_price.toFixed(2).replace('.', ',')}` : undefined
        };
    } catch (error) {
        console.error("Falha ao buscar ofertas do Mercado Livre:", error);
        return null;
    }
}
