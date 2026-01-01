import { AttachmentBuilder } from 'discord.js';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import type { CanvasRenderingContext2D } from '@napi-rs/canvas';
import { join } from 'path';
import { existsSync } from 'fs';
import { getRankingByPeriod, getAllUsers } from '../service/database';

export type RankingPeriod = 'total' | 'yearly' | 'weekly';

type Theme = 'default';

interface ThemeColors {
  background: string;
  text: string;
  textSecondary: string;
  bar1st: string; // 1位
  bar2nd: string; // 2位
  bar3rd: string; // 3位
  barOther: string; // その他
}

const THEMES: Record<Theme, ThemeColors> = {
  default: {
    background: '#0d1117', // GitHub風のダーク背景
    text: '#ffffff',
    textSecondary: '#8b949e',
    bar1st: '#ffd700', // 金色
    bar2nd: '#c0c0c0', // 銀色
    bar3rd: '#cd7f32', // 銅色
    barOther: '#58a6ff', // 青色
  },
};

// フォント登録
const fontPaths = [
  join(__dirname, '../fonts/NotoSans-Regular.ttf'),
  join(__dirname, '../../fonts/NotoSans-Regular.ttf'),
  join(process.cwd(), 'fonts/NotoSans-Regular.ttf'),
];

let fontRegistered = false;
for (const fontPath of fontPaths) {
  if (existsSync(fontPath)) {
    try {
      GlobalFonts.registerFromPath(fontPath, 'Noto Sans');
      console.log(`Font registered successfully from: ${fontPath}`);
      fontRegistered = true;
      break;
    } catch (error) {
      console.error(`Failed to register font from ${fontPath}:`, error);
    }
  }
}

if (!fontRegistered) {
  console.warn('Font file not found. Using default font.');
}

// 期間の開始時刻を取得
function getPeriodStart(period: RankingPeriod): number {
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const oneYear = 365 * 24 * 60 * 60 * 1000;

  switch (period) {
    case 'weekly':
      return now - oneWeek;
    case 'yearly':
      return now - oneYear;
    case 'total':
      return 0;
  }
}

// ランキングデータを取得
function getRankingData(period: RankingPeriod): {
  rankings: Array<{ userId: string; count: number }>;
  periodName: string;
} {
  const now = Date.now();
  const startTime = getPeriodStart(period);
  const endTime = now;

  let rankings: Array<{ userId: string; count: number }>;
  let periodName: string;

  if (period === 'total') {
    rankings = getAllUsers().sort((a, b) => b.count - a.count);
    periodName = 'Total';
  } else {
    rankings = getRankingByPeriod(startTime, endTime);
    periodName = period === 'yearly' ? 'Yearly' : 'Weekly';
  }

  return { rankings, periodName };
}

class RankingGenerator {
  private readonly PADDING = 60;
  private readonly TITLE_HEIGHT = 100;
  private readonly FOOTER_HEIGHT = 80;
  private readonly BAR_GAP = 20;
  private readonly BAR_MIN_WIDTH = 60;
  private readonly BAR_MAX_WIDTH = 120;
  private readonly BAR_RADIUS = 8;

  /**
   * ランキング画像を生成
   */
  async generateRanking(
    period: RankingPeriod,
    client: any,
    theme: Theme = 'default'
  ): Promise<AttachmentBuilder | null> {
    const { rankings, periodName } = getRankingData(period);

    if (rankings.length === 0) {
      return null;
    }

    // トップ10を取得
    const topRankings = rankings.slice(0, 10);

    // ユーザー名を事前に取得
    const usernames: string[] = [];
    for (let i = 0; i < topRankings.length; i++) {
      const rank = topRankings[i];
      let username = `User${i + 1}`;
      try {
        const user = client.users.cache.get(rank.userId);
        if (user) {
          username = user.username;
        } else {
          const fetchedUser = await client.users.fetch(rank.userId).catch(() => null);
          if (fetchedUser) {
            username = fetchedUser.username;
          }
        }
      } catch {
        // エラー時はデフォルト名を使用
      }
      usernames.push(username);
    }

    // キャンバスサイズを計算
    const chartAreaHeight = 500;
    const width = 1400;
    const height = this.TITLE_HEIGHT + chartAreaHeight + this.FOOTER_HEIGHT;

    const canvas = createCanvas(width, height);
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d');
    const colors = THEMES[theme];

    // 背景
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    // タイトル
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 48px "Noto Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${periodName} Ranking`, width / 2, 60);

    // 最大値を取得
    const maxCount = Math.max(...topRankings.map((r) => r.count));

    // チャートエリアの計算
    const chartX = this.PADDING;
    const chartY = this.TITLE_HEIGHT;
    const chartWidth = width - this.PADDING * 2;
    const chartHeight = chartAreaHeight;

    // バーの幅を計算（最大幅と最小幅の間で調整）
    const totalBarWidth = chartWidth - (topRankings.length - 1) * this.BAR_GAP;
    const barWidth = Math.min(
      this.BAR_MAX_WIDTH,
      Math.max(this.BAR_MIN_WIDTH, totalBarWidth / topRankings.length)
    );

    // バーを描画
    for (let index = 0; index < topRankings.length; index++) {
      const rank = topRankings[index];
      const barHeight = (rank.count / maxCount) * (chartHeight - 100); // 100はラベル用のスペース
      const x = chartX + index * (barWidth + this.BAR_GAP);
      const y = chartY + chartHeight - barHeight - 60; // 60はユーザー名表示用

      // バーの色を決定
      let barColor: string;
      if (index === 0) {
        barColor = colors.bar1st;
      } else if (index === 1) {
        barColor = colors.bar2nd;
      } else if (index === 2) {
        barColor = colors.bar3rd;
      } else {
        barColor = colors.barOther;
      }

      // 角丸矩形でバーを描画
      ctx.fillStyle = barColor;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, this.BAR_RADIUS);
      ctx.fill();

      // バーの上に数値を表示
      ctx.fillStyle = colors.text;
      ctx.font = 'bold 24px "Noto Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        rank.count.toLocaleString(),
        x + barWidth / 2,
        y - 10
      );

      // 順位を表示（バーの上部）
      ctx.fillStyle = colors.text;
      ctx.font = 'bold 28px "Noto Sans", sans-serif';
      ctx.textAlign = 'center';
      let rankText: string;
      if (index === 0) {
        rankText = '1st';
      } else if (index === 1) {
        rankText = '2nd';
      } else if (index === 2) {
        rankText = '3rd';
      } else {
        rankText = `${index + 1}th`;
      }
      ctx.fillText(rankText, x + barWidth / 2, y - 50);

      // ユーザー名を表示（バーの下）
      ctx.fillStyle = colors.textSecondary;
      ctx.font = '20px "Noto Sans", sans-serif';
      ctx.textAlign = 'center';
      // 長いユーザー名は短縮
      const displayName = usernames[index].length > 15
        ? usernames[index].substring(0, 13) + '..'
        : usernames[index];
      ctx.fillText(displayName, x + barWidth / 2, chartY + chartHeight - 20);
    }

    // フッター
    ctx.fillStyle = colors.textSecondary;
    ctx.font = '20px "Noto Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Total ${rankings.length} users finished...`,
      width / 2,
      height - 30
    );

    // 画像をバッファに変換
    const buffer = canvas.toBuffer('image/png');
    const attachment = new AttachmentBuilder(buffer, {
      name: `ranking-${period}.png`,
    });

    return attachment;
  }
}

// シングルトンインスタンス
const rankingGenerator = new RankingGenerator();

// ランキング画像を生成（後方互換性のため）
export async function createRankingImage(
  period: RankingPeriod,
  client: any
): Promise<AttachmentBuilder | null> {
  return rankingGenerator.generateRanking(period, client);
}
