import { Message, EmbedBuilder } from 'discord.js';
import { addBump } from '../service/database';
import { createRankingImage } from '../utils/ranking';
import { config } from '../config';

export async function handleMessage(message: Message): Promise<void> {
  if (message.author.bot) return;

  // !b コマンド
  if (message.content === '!b' || message.content.toLowerCase() === '!bump') {
    const userId = message.author.id;
    const count = addBump(userId);

    const embed = new EmbedBuilder()
      .setTitle(config.messages.bumpSuccess)
      .setDescription(config.messages.bumpCount(userId, count))
      .setColor(0x57f287)
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    return;
  }

  // !r コマンド（累計ランキングのみ）
  if (message.content === '!r' || message.content.toLowerCase() === '!ranking') {
    const loadingMessage = await message.reply('ランキングを生成中...');

    const image = await createRankingImage('total', message.client);

    if (!image) {
      await loadingMessage.edit({ content: 'まだランキングデータがありません。' });
      return;
    }

    await loadingMessage.edit({ content: '', files: [image] });
    return;
  }
}

