import * as fs from 'fs';
import * as path from 'path';

interface UserBumpData {
  bumps: Array<{
    timestamp: number;
  }>;
}

interface Database {
  users: Record<string, number>; // userId -> count
}

const DATA_DIR = path.join(__dirname, '../database');
const USERS_DIR = path.join(DATA_DIR, 'users');
const DATA_FILE = path.join(DATA_DIR, 'bumps.json');

// データディレクトリが存在しない場合は作成
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_DIR)) {
  fs.mkdirSync(USERS_DIR, { recursive: true });
}

// メインデータベースを読み込む（userId -> count）
function loadDatabase(): Database {
  if (!fs.existsSync(DATA_FILE)) {
    return { users: {} };
  }
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('データベースの読み込みエラー:', error);
    return { users: {} };
  }
}

// メインデータベースを保存する
function saveDatabase(db: Database): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('データベースの保存エラー:', error);
  }
}

// ユーザーの詳細データファイルのパスを取得
function getUserDataPath(userId: string): string {
  return path.join(USERS_DIR, `${userId}.json`);
}

// ユーザーの詳細データを読み込む
export function loadUserData(userId: string): UserBumpData {
  const userFile = getUserDataPath(userId);
  if (!fs.existsSync(userFile)) {
    return { bumps: [] };
  }
  try {
    const data = fs.readFileSync(userFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`ユーザー ${userId} のデータ読み込みエラー:`, error);
    return { bumps: [] };
  }
}

// ユーザーの詳細データを保存する
function saveUserData(userId: string, userData: UserBumpData): void {
  try {
    const userFile = getUserDataPath(userId);
    fs.writeFileSync(userFile, JSON.stringify(userData, null, 2), 'utf-8');
  } catch (error) {
    console.error(`ユーザー ${userId} のデータ保存エラー:`, error);
  }
}

// ユーザーのbumpを追加
export function addBump(userId: string): number {
  const db = loadDatabase();
  const now = Date.now();

  // カウントを更新
  if (!db.users[userId]) {
    db.users[userId] = 0;
  }
  db.users[userId] += 1;
  saveDatabase(db);

  // タイムスタンプをユーザーファイルに追加
  const userData = loadUserData(userId);
  userData.bumps.push({ timestamp: now });
  saveUserData(userId, userData);

  return db.users[userId];
}

// 全ユーザーのデータを取得（userIdとcountのみ）
export function getAllUsers(): Array<{ userId: string; count: number }> {
  const db = loadDatabase();
  return Object.entries(db.users).map(([userId, count]) => ({
    userId,
    count,
  }));
}

// 特定の期間のbumpを取得
export function getBumpsInPeriod(
  userId: string,
  startTime: number,
  endTime: number
): number {
  const userData = loadUserData(userId);
  return userData.bumps.filter(
    (bump) => bump.timestamp >= startTime && bump.timestamp <= endTime
  ).length;
}

// 期間別のランキングを取得
export function getRankingByPeriod(
  startTime: number,
  endTime: number
): Array<{ userId: string; count: number }> {
  const db = loadDatabase();
  const rankings: Array<{ userId: string; count: number }> = [];

  for (const userId in db.users) {
    const count = getBumpsInPeriod(userId, startTime, endTime);
    if (count > 0) {
      rankings.push({ userId, count });
    }
  }

  return rankings.sort((a, b) => b.count - a.count);
}
