import {
  ButtonInteraction,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { addBump } from '../service/database';
import { createRankingImage } from '../utils/ranking';
import { config } from '../config';

export async function handleButton(interaction: ButtonInteraction): Promise<void> {
  if (interaction.customId === 'bump_button') {
    const userId = interaction.user.id;
    const count = addBump(userId);

    const embed = new EmbedBuilder()
      .setTitle(config.messages.bumpSuccess)
      .setDescription(config.messages.bumpCount(userId, count))
      .setColor(0x57f287)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.customId === 'ranking_button') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const image = await createRankingImage('total', interaction.client);

    if (!image) {
      await interaction.editReply({ content: 'まだランキングデータがありません。' });
      return;
    }

    await interaction.editReply({ files: [image] });
    return;
  }
}

