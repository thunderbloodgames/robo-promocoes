import { kv } from '@vercel/kv';

// Interfaces (sem alteração)
interface MercadoLivreOffer {
    store: 'Mercado Livre';
    title: string;
    url: string;
    imageUrl: string;
    price: string;
    originalPrice?: string;
}
interface MeliToken {
    access_token: string;
    expires_in: number;
    created_at: number;
}

// Função de Token (sem alteração)
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

// --- Função Principal de Busca (ALTERADA PARA O TESTE) ---
export async function encontrarOfertaMercadoLivre(urlsJaPostadas: string[]): Promise<MercadoLivreOffer | null> {
    console.log("Buscando ofertas no Mercado Livre... (MODO DE TESTE ATIVADO)");
    const seuAffiliateId = 'kngnewstore';

    try {
        const accessToken = await getMercadoLivreToken();
        if (!accessToken) return null;

        // --- MUDANÇA AQUI: Em vez de buscar em 'deals', buscamos por 'iPhone 15' ---
        const searchQuery = "iPhone 15";
        const searchResponse = await fetch(`https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(searchQuery)}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!searchResponse.ok) {
            console.error("ML (Teste): Erro ao buscar por produto.");
            return null;
        }

        const searchData = await searchResponse.json();
        
        if (!searchData.results || searchData.results.length === 0) {
            console.log(`ML (Teste): A busca por "${searchQuery}" não retornou resultados.`);
            return null;
        }

        // Pega o primeiro produto da busca que ainda não foi postado
        const novoItem = searchData.results.find((item: any) => !urlsJaPostadas.includes(item.permalink));
        
        if (!novoItem) {
            console.log("ML (Teste): Todos os iPhones encontrados já foram postados.");
            return null;
        }

        const produto = novoItem;
        const linkAfiliado = `${produto.permalink}?mpreid=${seuAffiliateId}`;
        
        console.log(`ML (Teste): Produto encontrado - ${produto.title}`);
        return {
            store: 'Mercado Livre',
            title: produto.title,
            url: linkAfiliado,
            imageUrl: produto.thumbnail.replace(/^http:/, 'https:'),
            price: `R$ ${produto.price.toFixed(2).replace('.', ',')}`,
            originalPrice: produto.original_price ? `R$ ${produto.original_price.toFixed(2).replace('.', ',')}` : undefined
        };

    } catch (error) {
        console.error("Falha ao buscar ofertas (Modo Teste) do Mercado Livre:", error);
        return null;
    }
}
