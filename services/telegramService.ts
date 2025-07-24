// Envia um post com foto para o Telegram
export async function postPhoto(imageUrl: string, caption: string): Promise<void> {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHANNEL_ID;
    const url = `https://api.telegram.org/bot${token}/sendPhoto`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: chatId,
            photo: imageUrl,
            caption: caption,
            parse_mode: 'HTML'
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro ao postar no Telegram: ${errorData.description}`);
    }
}
