const express = require("express")
const path = require("path")
const multer = require("multer")
const unzipper = require("unzipper")
const fs = require("fs")
const { spawn } = require("child_process")

const app = express()

app.use(express.static(path.join(__dirname,"public")))

const upload = multer({ dest:"uploads/" })

let botProcess = null

app.post("/upload", upload.single("bot"), async (req,res)=>{

if(!req.file){
return res.send("Nenhum arquivo enviado")
}

const filePath = req.file.path

if(!fs.existsSync("./bots")){
fs.mkdirSync("./bots")
}

fs.createReadStream(filePath)
.pipe(unzipper.Extract({ path:"./bots/bot1" }))

res.send("Bot enviado com sucesso")

})

app.get("/start",(req,res)=>{

if(botProcess){
return res.send("Bot já está rodando")
}

botProcess = spawn("node",["bots/bot1/index.js"])

botProcess.stdout.on("data",(data)=>{
console.log(`BOT: ${data}`)
})

botProcess.stderr.on("data",(data)=>{
console.error(`BOT ERROR: ${data}`)
})

res.send("Bot iniciado")

})

app.get("/stop",(req,res)=>{

if(!botProcess){
return res.send("Nenhum bot rodando")
}

botProcess.kill()
botProcess = null

res.send("Bot parado")

})

const PORT = process.env.PORT || 3000

app.listen(PORT,()=>{
console.log("☁ EclipseCloud online")
})
