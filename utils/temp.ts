import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import type { CanvasRenderingContext2D } from '@napi-rs/canvas';
import { join } from 'path';
import { existsSync } from 'fs';

interface ContributionData {
  date: string;
  count: number;
}

interface ContributionDay {
  date: Date;
  count: number;
}

type Theme = 'default';

interface ThemeColors {
  level0: string; // 0回
  level1: string; // 1回
  level2: string; // 5回
  level3: string; // 10回
  level4: string; // 25回
}

const THEMES: Record<Theme, ThemeColors> = {
  default: {
    level0: '#151b23', // 黒
    level1: '#033A16',
    level2: '#196c2e',
    level3: '#2ea043',
    level4: '#56d364',
  }
};

function formatLocal(date: Date): string {
  // JST (UTC+9) に変換
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return jstDate.toISOString().split('T')[0] ?? '';
}

function getDayJST(date: Date): number {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return jst.getUTCDay();
}

// 複数のパスを試してフォントファイルを探す
const fontPaths = [
  join(__dirname, '../fonts/NotoSans-Regular.ttf'), // ローカル開発環境
  join(process.cwd(), 'fonts/NotoSans-Regular.ttf'), // Vercel環境（プロジェクトルート）
  join(process.cwd(), 'backend/fonts/NotoSans-Regular.ttf'), // モノレポ構造
  join(__dirname, '../../fonts/NotoSans-Regular.ttf'), // 代替パス
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
  console.warn(`Font file not found in any of the following paths:`);
  fontPaths.forEach(path => console.warn(`  - ${path}`));
  console.warn('Using default font (text may not render properly)');
}

class GraphGenerator {
  private readonly SQUARE_SIZE = 11;
  private readonly SQUARE_GAP = 2;
  private readonly WEEKS = 53;
  private readonly DAYS_PER_WEEK = 7;
  private readonly PADDING = 20;

  /**
   * 365日分のcontributionデータを統合
   */
  private mergeContributions(
    githubData: ContributionData[],
    gitlabData: ContributionData[]
  ): ContributionDay[] {
    const merged: ContributionDay[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);

    // データをMapに変換して高速化
    const githubMap = new Map<string, number>();
    for (const item of githubData) {
      githubMap.set(item.date, item.count);
    }

    const gitlabMap = new Map<string, number>();
    for (const item of gitlabData) {
      gitlabMap.set(item.date, item.count);
    }

    // 365日プラス今日（366日分）のデータを作成
    for (let i = 0; i < 366; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = formatLocal(date);

      const githubCount = githubMap.get(dateStr) || 0;
      const gitlabCount = gitlabMap.get(dateStr) || 0;
      const totalCount = githubCount + gitlabCount;

      merged.push({
        date,
        count: totalCount,
      });
    }

    return merged;
  }

  /**
   * contribution数に応じた色を取得
   */
  private getColor(count: number, theme: Theme = 'default'): string {
    const colors = THEMES[theme];
    if (count === 0) return colors.level0;
    if (count === 1) return colors.level1;
    if (count <= 2) return colors.level2;
    if (count <= 3) return colors.level3;
    if (count < 5) return colors.level3; // 11-24回はlevel3
    return colors.level4; // 25回以上
  }

  /**
   * グラフ画像を生成
   */
  async generateGraph(
    githubData: ContributionData[],
    gitlabData: ContributionData[],
    theme: Theme = 'default'
  ): Promise<Buffer> {
    const contributions = this.mergeContributions(githubData, gitlabData);

    // キャンバスサイズを計算
    const width = this.WEEKS * (this.SQUARE_SIZE + this.SQUARE_GAP) + this.PADDING * 2 + 50; // 50は曜日ラベル用
    const height = this.DAYS_PER_WEEK * (this.SQUARE_SIZE + this.SQUARE_GAP) + this.PADDING * 2 + 50; // 50は月ラベルと合計数表示用

    const canvas = createCanvas(width, height);
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d');

    // 背景をGitHubのページ背景色に（ダークモード: #0d1117）
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, width, height);

    // データを週ごとに整理（日曜日から始まる）
    const weeks: (ContributionDay | null)[][] = [];
    let currentWeek: (ContributionDay | null)[] = [];
    const firstContribution = contributions[0];
    const firstDayOfWeek = firstContribution ? getDayJST(firstContribution.date) : 0;

    // 最初の週の前に空の日を追加
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }

    // 各日を週に配置
    for (const contribution of contributions) {
      currentWeek.push(contribution);

      // 週が終わったら次の週へ
      if (currentWeek.length === 7) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    }

    // 最後の週を追加（空の日で埋める）
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    // 曜日ラベルを左側に縦に表示
    ctx.fillStyle = '#8b949e';
    ctx.font = '12px "Noto Sans", sans-serif';
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const dayLabelX = this.PADDING + 35; // グラフに近づける
    
    for (let day = 0; day < this.DAYS_PER_WEEK; day++) {
      // 曜日ラベルを表示（月曜日、水曜日、金曜日のみ）
      if (day === 1 || day === 3 || day === 5) {
        const y = this.PADDING + day * (this.SQUARE_SIZE + this.SQUARE_GAP) + this.SQUARE_SIZE / 2 + 4;
        ctx.fillText(dayLabels[day]!, dayLabelX, y);
      }
    }

    // 各日の四角を描画
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 時刻を0時に設定して日付のみで比較
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // 明日の日付
    const tomorrowStr = formatLocal(tomorrow); // YYYY-MM-DD形式

    for (let week = 0; week < weeks.length && week < this.WEEKS; week++) {
      const weekData = weeks[week]!;
      for (let day = 0; day < this.DAYS_PER_WEEK; day++) {
        const contribution = weekData[day];
        
        // nullの場合は描画しない（空の日）
        if (contribution == null) {
          continue;
        }

        // 日付を文字列形式で比較（タイムゾーンの問題を回避）
        const contributionDateStr = formatLocal(contribution.date);
        
        // 明日以降の日付は描画しない（今日まで表示）
        if (contributionDateStr >= tomorrowStr) {
          continue;
        }

        const x = this.PADDING + 50 + week * (this.SQUARE_SIZE + this.SQUARE_GAP);
        const y = this.PADDING + day * (this.SQUARE_SIZE + this.SQUARE_GAP);

        const color = this.getColor(contribution.count, theme);
        ctx.fillStyle = color;
        const radius = 2; // 角丸の半径
        ctx.beginPath();
        ctx.roundRect(x, y, this.SQUARE_SIZE, this.SQUARE_SIZE, radius);
        ctx.fill();
      }
    }

    // 月のラベルを追加
    ctx.fillStyle = '#8b949e';
    ctx.font = '12px "Noto Sans", sans-serif';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthLabelY = this.PADDING - 5;
    
    // 各週の最初の日が何月かを確認し、月が変わったタイミングでラベルを表示
    let lastMonth = -1;
    for (let week = 0; week < weeks.length && week < this.WEEKS; week++) {
      const weekData = weeks[week];
      if (!weekData) continue;
      
      // 週の最初の有効な日を見つける
      let firstDay: ContributionDay | null = null;
      for (const day of weekData) {
        if (day != null) {
          firstDay = day;
          break;
        }
      }
      
      if (firstDay) {
        const month = firstDay.date.getMonth();
        // 月が変わったタイミング、または最初の週の場合にラベルを表示
        if (month !== lastMonth || week === 0) {
          const x = this.PADDING + 50 + week * (this.SQUARE_SIZE + this.SQUARE_GAP);
          ctx.fillText(months[month]!, x, monthLabelY);
          lastMonth = month;
        }
      }
    }

    // 過去1年間の合計contribution数を計算
    const totalContributions = contributions.reduce((sum, contribution) => {
      const contributionDateStr = formatLocal(contribution.date);
      // 今日までの日付のみをカウント
      if (contributionDateStr < tomorrowStr) {
        return sum + contribution.count;
      }
      return sum;
    }, 0);

    // 凡例を追加
    const legendY = height - 20;
    const legendX = width - 150;
    ctx.fillText('Less', legendX, legendY);
    ctx.fillText('More', legendX + 100, legendY);

    // 凡例の色見本（5段階、0回=黒、多いほど明るい）
    const themeColors = THEMES[theme];
    const legendColors = [
      themeColors.level0,
      themeColors.level1,
      themeColors.level2,
      themeColors.level3,
      themeColors.level4,
    ];
    const legendRadius = 3; // 凡例の角丸の半径（より丸く）
    for (let i = 0; i < legendColors.length; i++) {
      ctx.fillStyle = legendColors[i]!;
      const legendSquareX = legendX + 30 + i * (this.SQUARE_SIZE + 2);
      ctx.beginPath();
      ctx.roundRect(legendSquareX, legendY - 10, this.SQUARE_SIZE, this.SQUARE_SIZE, legendRadius);
      ctx.fill();
    }

    // 合計contribution数を左下に表示
    ctx.fillStyle = '#8b949e';
    ctx.font = '12px "Noto Sans", sans-serif';
    const totalText = `${totalContributions.toLocaleString()} finishes in the last year`;
    const totalTextX = this.PADDING;
    const totalTextY = legendY + 10;
    ctx.fillText(totalText, totalTextX, totalTextY);

    // PNGとして返す
    return canvas.toBuffer('image/png');
  }
}

export default new GraphGenerator();
