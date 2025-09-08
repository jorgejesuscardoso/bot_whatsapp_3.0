// main.ts (ou onde você dá o start)
import { bot } from "./app"
import express from "express"
import { waService } from "./app"

async function bootstrap() {
  await bot.start()
  console.log("🤖 Bot Whats rodando!")

  // ⚡ só libera a API depois que o bot estiver pronto
  await waService.waitUntilReady()

  const app = express()
  app.use(express.json())

  app.post("/sendCode", async (req, res) => {
    const { whatsappNumber, code } = req.body
    if (!whatsappNumber || !code) {
      return res.status(400).json({ error: "Parâmetros ausentes!" })
    }

    try {
      let numbersOnlyDigits = whatsappNumber.replace(/\D/g, "")

      //remover o 9 depois do dd
      if (numbersOnlyDigits.length === 11 && numbersOnlyDigits[2] === '9') {
        numbersOnlyDigits = numbersOnlyDigits.slice(0, 2) + numbersOnlyDigits.slice(3)
      }

      const userJid = `55${numbersOnlyDigits}@s.whatsapp.net`

      const message = `
🔐 *Código de Verificação*

Aqui está o seu código: *${code}* ✅  

⚠️ *Atenção:* não compartilhe este código com ninguém.  
⏳ Ele será válido apenas pelos próximos *15 minutos*.  

Com carinho,
*Ming Yoongi - O mais lindo entre os lindos 🤖*
`


      await waService.sendMessage(userJid, { text: message }, {} as any)
      console.log(`✅ Enviado código ${code} para ${userJid}`)
      return res.json({ success: true })
    } catch (err) {
      console.error("❌ Erro ao enviar mensagem:", err)
      return res.status(500).json({ error: "Erro ao enviar mensagem no WhatsApp!" })
    }
  })

  app.listen(8000, () => console.log("🚀 Bot API rodando na porta 8000"))
}

bootstrap()
