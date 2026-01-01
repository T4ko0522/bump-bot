import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AttachmentBuilder,
} from 'discord.js';
import { loadUserData } from '../service/database';
import graphGenerator from '../utils/temp';

interface ContributionData {
  date: string;
  count: number;
}

// タイムスタンプを日付文字列に変換（YYYY-MM-DD形式）
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  // JST (UTC+9) に変換
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return jstDate.toISOString().split('T')[0] ?? '';
}

// ユーザーのbumpデータをContributionData形式に変換
function convertBumpsToContributions(userId: string): ContributionData[] {
  const userData = loadUserData(userId);
  const dateMap = new Map<string, number>();

  // タイムスタンプを日付ごとに集計
  for (const bump of userData.bumps) {
    const dateStr = formatDate(bump.timestamp);
    const currentCount = dateMap.get(dateStr) || 0;
    dateMap.set(dateStr, currentCount + 1);
  }

  // Mapを配列に変換
  const contributions: ContributionData[] = [];
  for (const [date, count] of dateMap.entries()) {
    contributions.push({ date, count });
  }

  return contributions;
}

export const data = new SlashCommandBuilder()
  .setName('log')
  .setDescription('bumpログをcontributionグラフで表示します')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('表示するユーザー（指定しない場合は自分）')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  // ユーザーオプションを取得（指定がない場合は実行したユーザー）
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const userId = targetUser.id;

  const contributions = convertBumpsToContributions(userId);

  // データがない場合は空の配列を渡す
  const emptyData: ContributionData[] = [];
  const imageBuffer = await graphGenerator.generateGraph(contributions, emptyData);

  const attachment = new AttachmentBuilder(imageBuffer, {
    name: 'contribution-graph.png',
  });

  await interaction.editReply({ files: [attachment] });
}

