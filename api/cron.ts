import type { NextRequest } from 'next/server';
import { generatePostContent } from '../services/geminiService.js';
import { postPhoto } from '../services/telegramService.js';
import { getPostedUrls, addPostedUrl } from '../services/storageService.js';

// Importa os novos serviços de busca de ofertas
import { encontrarOfertaMercadoLivre } from '../services/mlService.js';
import { encontrarOfertaShopee } from '../services/shopeeService.js';
import { encontrarOfertaAmazon } from '../services/amazonService.js';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    // Proteção para evitar execuções não autorizadas.
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }
    
    console.log("Iniciando novo ciclo de automação de promoções...");

    try {
        const urlsJaPostadas = await getPostedUrls();

        // 1. Busca ofertas nas 3 lojas ao mesmo tempo
        const [ofertaML, ofertaShopee, ofertaAmazon] = await Promise.all([
            encontrarOfertaMercadoLivre(urlsJaPostadas),
            encontrarOfertaShopee(urlsJaPostadas),
            encontrarOfertaAmazon(urlsJaPostadas)
        ]);

        // Filtra para pegar apenas as ofertas que foram encontradas (ignora os resultados nulos)
        const ofertasDoDia = [ofertaML, ofertaShopee, ofertaAmazon].filter(Boolean);

        if (ofertasDoDia.length === 0) {
            console.log("Nenhuma oferta nova encontrada em nenhuma loja.");
            return new Response("Nenhuma oferta nova.", { status: 200 });
        }

        console.log(`Encontradas ${ofertasDoDia.length} novas ofertas para postar.`);

        // 2. Para cada oferta encontrada, cria e publica o post
        for (const oferta of ofertasDoDia) {
            if (!oferta) continue;

            console.log(`Processando oferta da ${oferta.store}: ${oferta.title}`);
            
            // Monta um texto base para a IA
            const promptParaIA = `Crie um post curto e chamativo para o Telegram sobre esta promoção da loja ${oferta.store}. Use emojis de fogo, dinheiro ou presentes. Destaque o produto e o preço. O título é: "${oferta.title}". O preço é: ${oferta.price}.`;
            
            const textoDoPost = await generatePostContent(promptParaIA);
            const postFinal = `${textoDoPost}\n\n➡️ Compre aqui: ${oferta.url}`;

            await postPhoto(oferta.imageUrl, postFinal);
            console.log(`✅ Sucesso! Post da ${oferta.store} publicado no Telegram.`);

            // Adiciona a URL original (sem o tag de afiliado) à memória para evitar repetição
            const urlOriginal = oferta.url.split('?')[0];
            await addPostedUrl(urlOriginal);
        }
        
        return new Response("Ciclo de promoções concluído com sucesso!", { status: 200 });

    } catch (e: any) {
        const errorMessage = `❌ ERRO no ciclo de automação: ${e.message}`;
        console.error(errorMessage, e);
        return new Response(JSON.stringify({ success: false, message: errorMessage }), { status: 500 });
    }
}
