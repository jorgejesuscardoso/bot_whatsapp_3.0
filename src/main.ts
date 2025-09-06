import { createApp } from './app'
import { logger } from './utils/logger'

async function bootstrap() {
  logger.info('Iniciando bot...')

  const { bot } = createApp()
  await bot.start()
}

bootstrap()
