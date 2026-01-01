import dotenv from 'dotenv';

dotenv.config();

const BUMP_NAME = '絶頂';
const BUMP_NAME_LOWER = '絶頂';

export const config = {
  token: process.env.DISCORD_TOKEN || '',
  bump: {
    name: BUMP_NAME,
    nameLower: BUMP_NAME_LOWER,
  },
  messages: {
    bumpSuccess: '🤓',
    bumpCount: (userId: string, count: number) => `<@${userId}> の${BUMP_NAME}カウントは**${count}回**！`,
    bumpDescription: `${BUMP_NAME}カウントを+1`,
    panelTitle: `🗿 ${BUMP_NAME}`,
    panelDescription: `${BUMP_NAME}したら押せ！！`,
    panelButtonLabel: `${BUMP_NAME}した`,
  },
};

