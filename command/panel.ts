import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { config } from '../config';

export const data = new SlashCommandBuilder()
  .setName('panel')
  .setDescription(`${config.bump.name}パネルを表示します`);

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle(config.messages.panelTitle)
    .setDescription(config.messages.panelDescription)
    .setColor(0x5865f2)
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('bump_button')
      .setLabel(config.messages.panelButtonLabel)
      .setStyle(ButtonStyle.Primary)
      .setEmoji('⬆️'),
    new ButtonBuilder()
      .setCustomId('ranking_button')
      .setLabel('ランキング')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🗿')
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}

