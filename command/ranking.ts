import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { createRankingImage, RankingPeriod } from '../utils/ranking';

export const data = new SlashCommandBuilder()
  .setName('ranking')
  .setDescription('ランキングを表示します')
  .addStringOption((option) =>
    option
      .setName('period')
      .setDescription('ランキングの期間')
      .setRequired(false)
      .addChoices(
        { name: '累計', value: 'total' },
        { name: '年間', value: 'yearly' },
        { name: '週間', value: 'weekly' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const period = (interaction.options.getString('period') || 'total') as RankingPeriod;
  const image = await createRankingImage(period, interaction.client);

  if (!image) {
    await interaction.editReply({ content: 'まだランキングデータがありません。' });
    return;
  }

  await interaction.editReply({ files: [image] });
}

