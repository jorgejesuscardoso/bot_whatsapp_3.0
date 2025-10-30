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
import { BehaviorList } from '../utils/list/behavior'
import { FallingInLoveList, MarryList } from '../utils/list/fallInLoveList'
import { tantrumMsg, textRemove } from '../utils/msg/msgTantrum'

const phoneNumbers = {
  bot: '557381062081',
  yu: '180603542630589', 
  bushido: '67350002954389', 
  erica: '557391831250',
  anna: '236077289853042',
  dira: '557499385661',
  leh: '558587626062',
}

function normalizeText(txt: string) {
  return txt
    .toLowerCase()
    .normalize('NFD') // remove acentos
    .replace(/[\u0300-\u036f]/g, '');
}

let greetingsSended = [] as string[]
let wrongGreetingsSended = [] as string[]
let behaviorSended = [] as string[]
let disableGreetings = false
let countMsgRemovedYou = [] as string[]

//clear cache
setInterval(() => {
  greetingsSended = []
  wrongGreetingsSended = []
  disableGreetings = false
  countMsgRemovedYou = []
}, 60 * 60 * 1000) // limpa a cada 1 horas

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
    if (!msg.message) return

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

    // Especiais
    const fallingInLove = FallingInLoveList.some(f => content.toLowerCase().includes(f.toLowerCase()))
    const marry = MarryList.some(m => content.toLowerCase().includes(m.toLowerCase()))


    // Quem enviou a mensagem
    const author = msg.pushName || msg.key.participant || msg.key.remoteJid || 'desconhecido'
    const authorName = author.split('@')[0]


    const senderId = msg.key.participant || msg.key.remoteJid
    const admins = await this.wa.getGroupAdmins(sender)
    const senderIsAdmin = admins.includes(senderId!)

    // Normaliza o JID para comparação (remove tudo que não for número)
    const normalize = (jid?: string) => {
        const raw = (jid || '').split('@')[0]; // remove o @s.whatsapp.net
        return raw.split(':')[0]; // remove o :60
    };

    const senderIdNormalize = normalize(msg.key.participant || msg.key.remoteJid || '');
    
    console.log('Sender Normalizado:', senderIdNormalize);
    // pega o id do bot pra comparar
    const botId = normalize(this.wa.getSocket()?.user?.id || '');

    // Responder ao ser mencionado ou ao usar o nome do bot
    const mentionedJids: string[] = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const botNameUsed = botName.some(name => content.toLowerCase().includes(name))
    const botMentioned = mentionedJids.some(j => normalize(j) === botId);



    const botReplied = (() => {
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;

      if (!contextInfo || !contextInfo.quotedMessage) return false;

        // Pega o id do bot
        const botJid = this.wa.getSocket()?.user?.id || '';
        const botId = normalize(botJid);

        // Normaliza quem mandou a msg original respondida
        const originalSender = normalize(contextInfo.participant || '');

        // Se a msg respondida foi do próprio bot
        return originalSender === botId;
    })();

    


    logger.info(`[${group.name}] ${authorName}: ${content}`)
    
    const refToBot = botNameUsed || botMentioned || botReplied

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

   
    // if (senderIdNormalize === phoneNumbers.bot) {
    //   // se for o próprio bot, ignora
    //   return
    // }

    // --- 1) Checar bullying direcionado ao bot ---
    const lowerContent = content.toLowerCase();
    const hasBullying = BullyingList.some(b => lowerContent.includes(b.toLowerCase()));

    // --- Saudações ---
      const greetings = {
        morning: ["bom dia", "boa manhã"],
        afternoon: ["boa tarde"],
        night: ["boa noite", "boa madrugada"]
      };

      // --- Perguntas de turno ---
      const askMorning = ["é de manhã", "é manhã", "é de manha", "e de manha", "e manhã", "e de manhã"];
      const askAfternoon = ["é de tarde", "é tarde", "e de tarde", "e tarde"];
      const askNight = ["é de noite", "é noite", "e de noite", "e noite"];

      // Hora atual
      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();
      const formattedTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

      const isMorning = currentHour >= 5 && currentHour < 12;
      const isAfternoon = currentHour >= 12 && currentHour < 18;
      const isNight = currentHour >= 18 || currentHour < 5;

      const getCurrentTurn = () => {
        if (isMorning) return "manhã 🌞";
        if (isAfternoon) return "tarde 🌇";
        return "noite 🌙";
      };

      let response = "";

      if(wrongGreetingsSended.length > 25){
        response = "Vocês me cansam com essas saudações erradas. Vou desativar as saudações por uma hora. Vão caçar algo melhor pra fazer. 😤";
        disableGreetings = true
      }

      // --- 1) Responder a SAUDAÇÕES ---
      if (refToBot && !disableGreetings && response === "") {
        if (greetings.morning.some(g => lowerContent.includes(g))) {
          if (isMorning) {
            let available = goodMorning.filter(msg => !greetingsSended.includes(msg));
            response = available.length > 0
              ? available[Math.floor(Math.random() * available.length)]
              : `Bom dia ${authorName} 🌞😎✨`;
            greetingsSended.push(response);

          } else {
            response = `Salve! Não é de manhã não🤨! Agora é ${getCurrentTurn()}`;
            wrongGreetingsSended.push(response);
          }
        } else if (greetings.afternoon.some(g => lowerContent.includes(g))) {
          if (isAfternoon) {
            let available = goodAfternoon.filter(msg => !greetingsSended.includes(msg));
            response = available.length > 0
              ? available[Math.floor(Math.random() * available.length)]
              : `Boa tarde ${authorName} 🌞😎✨`;
            greetingsSended.push(response);
          } else {
            response = `Salve! Não é de tarde não🤨! Agora é ${getCurrentTurn()}`;
            wrongGreetingsSended.push(response);
          }
        } else if (greetings.night.some(g => lowerContent.includes(g))) {
          if (isNight) {
            let available = goodNight.filter(msg => !greetingsSended.includes(msg));
            response = available.length > 0
              ? available[Math.floor(Math.random() * available.length)]
              : `Boa noite ${authorName} 🌟😴✨`;
            greetingsSended.push(response);
          } else {
            response = `Salve! Ainda não é noite não🤨! Agora é ${getCurrentTurn()} 👀`;
            wrongGreetingsSended.push(response);
          }
        }
      }

      // --- 2) Responder a PERGUNTAS DE TEMPO ---
      if (refToBot && response === "") {
        if (
          lowerContent.includes("que horas") ||
          lowerContent.includes("que hora") ||
          lowerContent.includes("são horas") ||
          lowerContent.includes("são que horas") ||
          lowerContent.includes("quantas horas")
        ) {
          response = `Agora são exatamente ${formattedTime} ⏰`;
        } else if (askMorning.some(p => lowerContent.includes(p))) {
          response = isMorning
            ? "Sim, ainda é manhã 🌞"
            : `Não, não é de manhã não 😅 Agora é ${getCurrentTurn()}`;
        } else if (askAfternoon.some(p => lowerContent.includes(p))) {
          response = isAfternoon
            ? "Sim, é tarde agora 🌇"
            : `Não, não é de tarde não 😅 Agora é ${getCurrentTurn()}`;
        } else if (askNight.some(p => lowerContent.includes(p))) {
          response = isNight
            ? "Sim, é noite 🌙"
            : `Ainda não é noite não 😅 Agora é ${getCurrentTurn()}`;
        }
      }

      // --- Se tiver resposta, envia ---
      if (response) {
        await this.wa.sendMessage(sender, { text: response }, { quoted: msg });
        console.log("Saudações enviadas: ", wrongGreetingsSended);
        return;
      }

    // Responder a texto de comportamento

    const hasBehavior = BehaviorList.some(b => lowerContent.includes(b.toLowerCase()));

    if (refToBot && hasBehavior) {
      if (behaviorSended.length > 10) {
        response = "Vocês são chatos demais com esse negócio de comportamento. Vou desativar essas respostas por uma hora. 😤";
        disableGreetings = true;
      } else {
        response = "Me obrigue! Quero ver quem tem coragem! 😤";
        behaviorSended.push(response);
      }
    }

    // --- Responder a declarações de amor ao bot ---
    if(refToBot && fallingInLove){
      response = "Legal, agora senta lá! Antes que a Anna, amor da minha vida, te mate!🤖";
      await this.wa.sendMessage(sender, { text: response }, { quoted: msg });
      return;
    }

    // Responder pedido de casamento
    if(refToBot && marry){
      
      if (senderIdNormalize === numbers.anna) {
          response = "💘👑 Minha Anna… você ainda pergunta? 🤍 Eu aceito casar com você mil vezes, em todas as vidas, em todos os mundos. 🌎✨ Você é meu começo, meu meio e meu fim. 💍😍";
          await this.wa.sendMessage(sender, { text: response }, { quoted: msg });
          return;
      }
      response = "Casar com você? Tá doida(o)? Quer morrer? A Anna te mata, cão! 🤖👑";
      await this.wa.sendMessage(sender, { text: response }, { quoted: msg });
      return;
    }

    if (refToBot && /(aceita|quer)( se)? casar com/i.test(content) || refToBot && /(casa com|case com)/i.test(content)) {
        // tenta casar com diferentes regex
      const regexes = [
          /aceita casar com (.+?)(\?|$)/i,
          /quer casar com (.+?)(\?|$)/i,
          /quer se casar com (.+?)(\?|$)/i,
          /aceita se casar com (.+?)(\?|$)/i,
          /casa com (.+?)(\?|$)/i,          
          /case com (.+?)(\?|$)/i
      ];

      let nome: string | null = null;

      for (const r of regexes) {
          const m = content.match(r);
          if (m?.[1]) { // se existir, já pega
              nome = m[1].trim();
              break;
          }
      }
      const undefinedNames = ['a', 'o', '', ' a', ' o'];
      const isUndefinedName = nome && undefinedNames.includes(nome.toLowerCase().trim());
      console.log(isUndefinedName)

      if(isUndefinedName) {
       response = "Casar com quem, doido(a)? 🫏🤣 Com a Anna? 👑💘 Sim, claro, óbvio, só se for agora! 🚀🔥";
        await this.wa.sendMessage(sender, { text: response }, { quoted: msg });
        return;
      }
      console.log(nome)
      if(nome && nome.toLocaleLowerCase() === "a anna" || nome && nome.toLocaleLowerCase() === "anna") {
        response = "Sim, claro, óbvio, só se for agora! 🚀🔥";
        await this.wa.sendMessage(sender, { text: response }, { quoted: msg });
        return;
      }

      if (nome) {
          response = `Casar com ${nome}? 🤖 Tu surtou foi 😱? Quer que aconteça um assassinato aqui, é??? Não deixe a Anna ver isso não! Apague, apague, apague, apague!!! 😱😱😱`;
      } else {
          response = "Casamento? 🤖 Só com o amor da minha vida, Anna! 💘💅🔥💍";
      }

      await this.wa.sendMessage(sender, { text: response }, { quoted: msg });
      return;
    }


    // --- Responder bullying ---
    if (refToBot && hasBullying) {
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

    const idsBot = [
      "120363404528960553",
      "120363402452354299"
    ]
    // --- Responder menções ou uso do nome do bot ---
    if (refToBot) {  
      console.log(senderIdNormalize, 'meu num', numbers.yu)
      if(idsBot.some(s => s.includes(authorName))) return;
      let response = "Olá, " + authorName + "! Como posso ajudar? 🤖👊🏽💪";
       if (senderIdNormalize === numbers.yu) {
          response = this.msgTo.toYu();
        }  else if (senderIdNormalize === numbers.erica) {
          response = this.msgTo.toErica();
        } else if (senderIdNormalize === numbers.anna) {
          response = this.msgTo.toAnna();
        } else if (senderIdNormalize === numbers.dira) {
          response = this.msgTo.toDira();
        } else if (senderIdNormalize === numbers.leh) {
          response = this.msgTo.toLeh();
        } else if (senderIdNormalize === numbers.bushido) {
          response = this.msgTo.toBushido();
        }

      await this.wa.sendMessage(sender, { text: response }, { quoted: msg })
      return
    }
    
    // --- Comandos de ADMIN ---
      const context = msg.message?.extendedTextMessage?.contextInfo
      const quotedMsg = context?.quotedMessage
      const stanzaId = context?.stanzaId
      const participant = context?.participant
      const textQuoted = quotedMsg?.extendedTextMessage?.text
      const textNormalized = textQuoted && normalizeText(textQuoted)

    if (!senderIsAdmin && (content === '&marcar' || content === '&citar' || content === '&menu')) {
      logger.info(`[${group.name}] ${authorName} tentou usar "${content}" sem permissão`)
      await this.wa.sendMessage(sender, {
        text: '❌ Apenas administradores podem usar este comando.',
      }, { quoted: msg })
      return
    }

    // Primeiro, se a pessoa NÃO respondeu a msg
    if (content === '&citar' && (!quotedMsg || !stanzaId || !participant)) {
      await this.wa.sendMessage(sender, {
        text: 'Responda a mensagem que deseja citar com &citar.',
      }, { quoted: msg })
      return
    }    

    if (content === '&citar' && textRemove.some(t => normalizeText(t.toLocaleLowerCase()) === textNormalized?.toLowerCase())) {
      // índice baseado na quantidade de mensagens já enviadas
      const idx = countMsgRemovedYou.length

      // se ainda tem frase disponível
      if (idx < tantrumMsg.length) {
        const resposta = tantrumMsg[idx]

        await this.wa.sendMessage(sender, {
          text: resposta,
        }, { quoted: msg })

        // salva a mensagem enviada pra manter o controle
        countMsgRemovedYou.push(resposta)
        return
      } else {
        // caso todas já tenham sido usadas
        await this.wa.sendMessage(sender, {
          text: '😅 Acabaram minhas birras, não tenho mais o que falar!',
        }, { quoted: msg })
        return
      }
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
