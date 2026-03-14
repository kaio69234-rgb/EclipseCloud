const express = require("express")
const fs = require("fs")
const path = require("path")
const multer = require("multer")
const unzipper = require("unzipper")
const { spawn } = require("child_process")

const app = express()

const uploads = "./uploads"
const apps = "./apps"

if (!fs.existsSync(uploads)) fs.mkdirSync(uploads)
if (!fs.existsSync(apps)) fs.mkdirSync(apps)

const storage = multer.diskStorage({
destination: uploads,
filename: (req, file, cb) => {
cb(null, Date.now() + ".zip")
}
})

const upload = multer({ storage })

let runningBots = {}

app.get("/", (req,res)=>{
res.send("☁ EclipseCloud funcionando")
})

app.post("/upload", upload.single("bot"), async (req,res)=>{

const zipPath = req.file.path
const botId = Date.now().toString()
const botFolder = path.join(apps, botId)

fs.mkdirSync(botFolder)

fs.createReadStream(zipPath)
.pipe(unzipper.Extract({ path: botFolder }))
.on("close", ()=>{

fs.unlinkSync(zipPath)

res.json({
status:"ok",
id:botId
})

})

})

app.post("/start/:id", (req,res)=>{

const id = req.params.id
const botPath = path.join(apps,id)

if (!fs.existsSync(botPath))
return res.send("Bot não encontrado")

const proc = spawn("node", ["index.js"], {
cwd: botPath
})

runningBots[id] = proc

proc.stdout.on("data",data=>{
console.log(`[BOT ${id}] ${data}`)
})

proc.stderr.on("data",data=>{
console.log(`[BOT ${id} ERROR] ${data}`)
})

res.send("Bot iniciado")

})

app.post("/stop/:id",(req,res)=>{

const id = req.params.id

if (!runningBots[id])
return res.send("Bot não está rodando")

runningBots[id].kill()
delete runningBots[id]

res.send("Bot parado")

})

app.listen(3000, ()=>{
console.log("☁ EclipseCloud rodando na porta 3000")
})
