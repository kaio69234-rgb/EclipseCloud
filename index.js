const express = require("express")
const path = require("path")
const multer = require("multer")
const unzipper = require("unzipper")
const fs = require("fs")
const { spawn } = require("child_process")

const app = express()

app.use(express.static(path.join(__dirname, "public")))

const upload = multer({ dest: "uploads/" })

let botProcess = null

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})


// =======================
// ENVIAR BOT
// =======================

app.post("/upload", upload.single("bot"), async (req, res) => {

  if (!req.file) {
    return res.send("Nenhum arquivo enviado")
  }

  const filePath = req.file.path
  const botFolder = "./bots/bot1"

  try {

    if (!fs.existsSync("./bots")) {
      fs.mkdirSync("./bots")
    }

    if (!fs.existsSync(botFolder)) {
      fs.mkdirSync(botFolder)
    }

    fs.createReadStream(filePath)
    .pipe(unzipper.Extract({ path: botFolder }))
    .on("close", () => {

      fs.unlinkSync(filePath)

      console.log("Bot extraído com sucesso")

      res.send("Bot enviado com sucesso!")

    })

  } catch (err) {

    console.error(err)

    res.send("Erro ao enviar bot")

  }

})


// =======================
// INICIAR BOT
// =======================

app.get("/start", (req, res) => {

  if (botProcess) {
    return res.send("Bot já está rodando")
  }

  const botPath = "bots/bot1/index.js"

  if (!fs.existsSync(botPath)) {
    return res.send("Arquivo index.js do bot não encontrado")
  }

  botProcess = spawn("node", [botPath])

  botProcess.stdout.on("data", (data)=>{
    console.log(`BOT: ${data}`)
  })

  botProcess.stderr.on("data", (data)=>{
    console.error(`BOT ERROR: ${data}`)
  })

  botProcess.on("close",(code)=>{
    console.log(`Bot finalizado com código ${code}`)
    botProcess = null
  })

  res.send("Bot iniciado!")

})


// =======================
// PARAR BOT
// =======================

app.get("/stop", (req, res) => {

  if (!botProcess) {
    return res.send("Nenhum bot rodando")
  }

  botProcess.kill()

  botProcess = null

  res.send("Bot parado!")

})


// =======================
// PORTA
// =======================

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("☁ EclipseCloud está online!")
})
