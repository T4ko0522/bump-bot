import { Collection, ChatInputCommandInteraction } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';

export interface Command {
  data: any;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// コマンドを読み込む
export function loadCommands(): Collection<string, Command> {
  const commands = new Collection<string, Command>();
  const commandsPath = path.join(__dirname, '../command');
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      commands.set(command.data.name, command);
    }
  }

  return commands;
}

