import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { addBump } from '../service/database';
import { config } from '../config';

export const data = new SlashCommandBuilder()
  .setName('bump')
  .setDescription(config.messages.bumpDescription);

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const count = addBump(userId);

  const embed = new EmbedBuilder()
    .setTitle(config.messages.bumpSuccess)
    .setDescription(config.messages.bumpCount(userId, count))
    .setColor(0x57f287)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

