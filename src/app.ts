import { WhatsAppService } from './services/WaServices'
import { Bot } from './core/Bot'
import { MsgTo } from './utils/msgPersonality'
import { MsgAboutBullying } from './utils/msgAboutBullying'

export function createApp() {
  const waService = new WhatsAppService()
  const msgTo = new MsgTo()
  const msgAboutBullying = new MsgAboutBullying()
  const bot = new Bot(waService, msgTo, msgAboutBullying)


  return {
    bot,
  }
}
