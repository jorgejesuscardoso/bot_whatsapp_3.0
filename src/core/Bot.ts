import { WhatsAppService } from '../services/WaServices'
import { proto } from '@whiskeysockets/baileys'
import { logger } from '../utils/logger'
import { GROUPS } from '../groups'
import { MsgTo } from '../utils/msg/msgPersonality'
import { MsgAboutBullying } from '../utils/msg/msgAboutBullying'
import { BullyingList } from '../utils/list/bullyingList'
import { goodMorning } from '../utils/greetings'
import { goodAfternoon } from '../utils/greetings'
import { goodNight } from '../utils/greetings'
import { commandsMenu } from '../utils/menu'

const phoneNumbers = {
  bot: '557381062081',
  yu: '553898051752', 
  bushido: '557381971736', 
  erica: '557391831250',
  anna: '557381828372',
  dira: '557499385661',
  leh: '558587626062',
}

const botName = ['yoonie', 'min yoongi', 'yoongi', 'yoon']

export class Bot {

  constructor(
    private wa: WhatsAppService,
    private msgTo: MsgTo,
    private msgAboutBullying: MsgAboutBullying
  ) {

  }

  async start() {
    await this.wa.initialize(
      this.handleMessage.bind(this),
    )
    
  }

  //configuração de comandos e msg
  private async handleMessage(msg: proto.IWebMessageInfo) {
    if (!msg.message || msg.key.fromMe) return

    const sender = msg.key.remoteJid!
    const group = GROUPS.find(g => g.id === sender)

    // Se não for um grupo registrado, ignora
    if (!group) return

    const content =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      ''

    const author = msg.pushName || msg.key.participant || msg.key.remoteJid || 'desconhecido'
    const authorName = author.split('@')[0]

    logger.info(`[${group.name}] ${authorName}: ${content}`)

    const senderId = msg.key.participant || msg.key.remoteJid
    const admins = await this.wa.getGroupAdmins(sender)
    const senderIsAdmin = admins.includes(senderId!)

    // Responder ao ser mencionado ou ao usar o nome do bot
    const mentionedJids: string[] = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const botNameUsed = botName.some(name => content.toLowerCase().includes(name))

    const normalize = (jid?: string) => (jid || '').replace(/[^0-9]/g, '');
    const senderIdNormalize = normalize(msg.key.participant || msg.key.remoteJid || '');
    // pega o id do bot pra comparar
    const botId = normalize(this.wa.getSocket()?.user?.id || '');
    const botMentioned = mentionedJids.some(j => normalize(j) === botId);

    // NAO ESQUECER DE NORMALIZAR OS NUMEROS////
    const numbers = {
      bot: normalize(phoneNumbers.bot),
      yu: normalize(phoneNumbers.yu),
      bushido: normalize(phoneNumbers.bushido),
      erica: normalize(phoneNumbers.erica),
      anna: normalize(phoneNumbers.anna),
      dira: normalize(phoneNumbers.dira),
      leh: normalize(phoneNumbers.leh),
    };

    // --- aqui entra tua lógica ---
    if (senderIdNormalize === phoneNumbers.bot) {
      // se for o próprio bot, ignora
      return
    }

    // --- 1) Checar bullying direcionado ao bot ---
    const lowerContent = content.toLowerCase();
    const hasBullying = BullyingList.some(b => lowerContent.includes(b.toLowerCase()));

    // --- 2) Responder a saudações ---
    const greetings = {
      morning: ["bom dia", "boa manhã"],
      afternoon: ["boa tarde"],
      night: ["boa noite", "boa madrugada"]
    };

    if (botNameUsed && lowerContent.includes("bom dia") || botNameUsed && lowerContent.includes("boa tarde") || botNameUsed && lowerContent.includes("boa noite") || botNameUsed && lowerContent.includes("boa madrugada")) {
      let response = ""; 

      // --- verifica se tem alguma saudação ---
      const saidMorning = greetings.morning.some(g => lowerContent.includes(g));
      const saidAfternoon = greetings.afternoon.some(g => lowerContent.includes(g));
      const saidNight = greetings.night.some(g => lowerContent.includes(g));

      const currentHour = new Date().getHours();
      const isMorning = currentHour >= 5 && currentHour < 12;
      const isAfternoon = currentHour >= 12 && currentHour < 18;
      const isNight = currentHour >= 18 || currentHour < 5;

      if (saidMorning) {
        response = isMorning
          ? goodMorning[Math.floor(Math.random() * goodMorning.length)]
          : "Não é de manhã ainda 😅";
      } else if (saidAfternoon) {
        response = isAfternoon
          ? goodAfternoon[Math.floor(Math.random() * goodAfternoon.length)]
          : "Não é de tarde agora 😅";
      } else if (saidNight) {
        response = isNight
          ? goodNight[Math.floor(Math.random() * goodNight.length)]
          : "Não é de noite ainda 😅";
      }

      await this.wa.sendMessage(sender, { text: response }, { quoted: msg });
      return;
    }

    // --- Responder bullying ---
    if ((botMentioned || botNameUsed) && hasBullying) {
      if (senderIdNormalize === numbers.anna) {
        const response = this.msgAboutBullying.toAnna();
        await this.wa.sendMessage(sender, { text: response }, { quoted: msg });
        return;
      } else if (senderIdNormalize === numbers.erica) {
        const response = this.msgAboutBullying.toErica();
        await this.wa.sendMessage(sender, { text: response }, { quoted: msg });
        return;
      } else if (senderIdNormalize === numbers.bushido) {
        const response = this.msgAboutBullying.toDaddyTroller();
        await this.wa.sendMessage(sender, { text: response }, { quoted: msg });
        return;
      }

      const response = this.msgAboutBullying.toDaddy();
      await this.wa.sendMessage(sender, { text: response }, { quoted: msg });
      return;
    }
    // --- Responder menções ou uso do nome do bot ---
    if (botNameUsed) {      
      let response = "Oié, como posso ajudar?";
       if (senderIdNormalize === numbers.yu) {
          response = this.msgTo.toYu();
        } else if (senderIdNormalize === numbers.bushido) {
          response = this.msgTo.toBushido();
        } else if (senderIdNormalize === numbers.erica) {
          response = this.msgTo.toErica();
        } else if (senderIdNormalize === numbers.anna) {
          response = this.msgTo.toAnna();
        } else if (senderIdNormalize === numbers.dira) {
          response = this.msgTo.toDira();
        } else if (senderIdNormalize === numbers.leh) {
          response = this.msgTo.toLeh();
        }

      await this.wa.sendMessage(sender, { text: response }, { quoted: msg })
      return
    }
    

    if (!senderIsAdmin && (content === '&marcar' || content === '&citar' || content === '&menu')) {
      logger.info(`[${group.name}] ${authorName} tentou usar "${content}" sem permissão`)
      await this.wa.sendMessage(sender, {
        text: '❌ Apenas administradores podem usar este comando.',
      }, { quoted: msg })
      return
    }

    if (content === '&status') {
      const participantes = await this.wa.getGroupParticipants(sender)
      const mentions = participantes.filter(id => id !== this.wa.getSocket()?.user?.id)

      await this.wa.sendMessage(sender, {
        text: `Estou online e funcionando bem.🌟✨`,
      }, { quoted: msg })
    }


    if (content === '&marcar') {
      const participantes = await this.wa.getGroupParticipants(sender)
      const mentions = participantes.filter(id => id !== this.wa.getSocket()?.user?.id)

      await this.wa.sendMessage(sender, {
        text: `Marcando ${mentions.length} membros do grupo.`,
        mentions,
      }, { quoted: msg })
    }

    if (content === '&citar') {
      const context = msg.message?.extendedTextMessage?.contextInfo
      const quotedMsg = context?.quotedMessage
      const stanzaId = context?.stanzaId
      const participant = context?.participant

      if (!quotedMsg || !stanzaId || !participant) {
        await this.wa.sendMessage(sender, {
          text: 'Responda a mensagem que deseja citar com &citar.',
        }, { quoted: msg })
        return
      }

      const participantes = await this.wa.getGroupParticipants(sender)
      const mentions = participantes.filter(id => id !== this.wa.getSocket()?.user?.id)

      // 🧠 Tenta extrair o conteúdo visível da mensagem citada
      const citadoTexto =
        quotedMsg.conversation ||
        quotedMsg.extendedTextMessage?.text ||
        quotedMsg.imageMessage?.caption ||
        quotedMsg.videoMessage?.caption ||
        quotedMsg.documentMessage?.caption ||
        '[Mensagem não textual ou sem suporte]'

      await this.wa.sendMessage(sender, {
        text: citadoTexto,
        mentions,
      }, { quoted: msg })
      }
    
    if (content === '&menu') {

    await this.wa.sendMessage(sender, {
      text: commandsMenu,
    }, { quoted: msg })
    }
  }
}
