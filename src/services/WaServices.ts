import makeWASocket,
 {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  WASocket,
  proto,
} from '@whiskeysockets/baileys'
import { logger } from '../utils/logger'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'
import { welcome } from '../utils/msg/msgDefaults'

export class WhatsAppService {
  private sock: WASocket | undefined
  private ready: Promise<void>
  private resolveReady!: () => void

  constructor() {
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve
    })
  }

  async initialize(onMessage: (msg: proto.IWebMessageInfo) => void) {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const { version } = await fetchLatestBaileysVersion()
    

    this.sock = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: true,
    })


    this.sock.ev.on('messages.upsert', async ({ messages }) => {
      if (!messages[0]) return
      onMessage(messages[0])
    })

    

    this.sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        qrcode.generate(qr, { small: true }) // ← exibe no terminal
      }

      if (connection === 'close') {
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode
        logger.error(`Conexão encerrada: ${code}`)
        if (code !== DisconnectReason.loggedOut) this.initialize(onMessage)
      } else if (connection === 'open') {
        logger.success('Bot conectado ao WhatsApp!')        
        this.resolveReady() // <<< libera a promise
      }
    })

    this.sock.ev.on('creds.update', saveCreds)
    
    const sentWelcome = new Set(); // Armazena quem já recebeu boas-vindas

    this.sock.ev.on('group-participants.update', async update => {      
      const { id, participants, action } = update;

      if (update.action !== 'add') return

      const groupId = update.id

      const metadata = await this.sock!.groupMetadata(groupId)
      const groupName = metadata.subject

      if(action === "add" && (id === "120363402452354299@g.us" || id === "120363392431154795@g.us")) {
        for (const participant of participants) {

          if (sentWelcome.has(participant)) {
              console.log(`Já enviou boas-vindas para @${participant.split("@")[0]}`);
              continue; // Se já enviou, pula este usuário
          }

          try {
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Evita spam de mensagens
            await this.sock!.sendMessage(groupId, {
              text: welcome(participant.split("@")[0]),
              mentions: [participant],
            })          
            sentWelcome.add(participant); // Marca como já enviado
          } catch (error) {
            console.error(`Erro ao enviar boas-vindas para ${participant}:`, error);
          }
        }
      }
    })
  }

   async waitUntilReady() {
    await this.ready
  }

  async getGroupAdmins(jid: string): Promise<string[]> {
    if (!this.sock) throw new Error('Socket não está inicializado ainda.')
    const metadata = await this.sock.groupMetadata(jid)
    const admins = metadata.participants
      .filter(p => p.admin)
      .map(p => p.id)
    return admins
  }


  async sendMessage(jid: string, message: any, p0: { quoted: proto.IWebMessageInfo }) {
    if (!this.sock) throw new Error('Socket não inicializado')
    return this.sock.sendMessage(jid, message)
  }

  async getGroupParticipants(jid: string): Promise<string[]> {
    if (!this.sock) throw new Error('Socket não inicializado')
    const metadata = await this.sock.groupMetadata(jid)
    return metadata.participants.map(p => p.id)
  }

  getSocket() {
    return this.sock
  }
}
