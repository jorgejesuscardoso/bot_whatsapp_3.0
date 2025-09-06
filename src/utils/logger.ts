import chalk from 'chalk'

export const logger = {
  info: (msg: string) => console.log(chalk.blue('[INFO]'), msg),
  success: (msg: string) => console.log(chalk.green('[OK]'), msg),
  error: (msg: string) => console.log(chalk.red('[ERROR]'), msg),
}
