import { Client, GatewayIntentBits, Events, REST, Routes, MessageFlags } from 'discord.js';
import { config } from './config';
import { loadCommands } from './handler/commandHandler';
import { handleMessage } from './handler/messageHandler';
import { handleButton } from './handler/buttonHandler';

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// コマンドを読み込む
export const commands = loadCommands();

// ボットが準備完了したとき
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ ${readyClient.user.tag} としてログインしました！`);

  // Slashコマンドを登録
  try {
    const rest = new REST().setToken(config.token);
    const commandsData = commands.map((command) => command.data.toJSON());

    console.log(`${commandsData.length}個のSlashコマンドを登録中...`);

    await rest.put(
      Routes.applicationCommands(readyClient.user.id),
      { body: commandsData }
    );

    console.log('✅ Slashコマンドの登録が完了しました！');
  } catch (error) {
    console.error('❌ Slashコマンドの登録中にエラーが発生しました:', error);
  }
});

// Slashコマンドの処理
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);

    if (!command) {
      console.error(`コマンド ${interaction.commandName} が見つかりません。`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('コマンド実行中にエラーが発生しました:', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'コマンドの実行中にエラーが発生しました。',
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: 'コマンドの実行中にエラーが発生しました。',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  } else if (interaction.isButton()) {
    try {
      await handleButton(interaction);
    } catch (error) {
      console.error('ボタン処理中にエラーが発生しました:', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'ボタンの処理中にエラーが発生しました。',
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: 'ボタンの処理中にエラーが発生しました。',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }
});

// メッセージが作成されたとき
client.on(Events.MessageCreate, async (message) => {
  try {
    await handleMessage(message);
  } catch (error) {
    console.error('メッセージ処理中にエラーが発生しました:', error);
  }
});

// エラーハンドリング
client.on(Events.Error, (error) => {
  console.error('エラーが発生しました:', error);
});

