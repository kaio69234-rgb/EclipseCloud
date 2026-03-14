const express = require("express")
const fs = require("fs")
const path = require("path")
const multer = require("multer")
const unzipper = require("unzipper")
const { spawn } = require("child_process")

const app = express()

// pastas
const uploads = "./uploads"
const apps = "./apps"

// bots rodando
let runningBots = {}

// criar pastas se não existirem
if (!fs.existsSync(uploads)) fs.mkdirSync(uploads)
if (!fs.existsSync(apps)) fs.mkdirSync(apps)

// permitir html
app.use(express.static("public"))
app.use(express.json())

// configuração upload
const storage = multer.diskStorage({
destination: uploads,
filename: (req,file,cb)=>{
cb(null, Date.now()+".zip")
}
})

const upload = multer({storage})

// ler eclipse.config
function readConfig(folder){

const configPath = path.join(folder,"eclipse.config")

if(!fs.existsSync(configPath))
return null

const lines = fs.readFileSync(configPath,"utf8").split("\n")

let config = {}

lines.forEach(line=>{
const [key,value] = line.split("=")

if(key && value){
config[key.trim()] = value.trim()
}
})

return config
}

//////////////////////////////////////////////////
// UPLOAD DO BOT
//////////////////////////////////////////////////

app.post("/upload", upload.single("bot"), (req,res)=>{

const zipPath = req.file.path
const botId = Date.now().toString()
const botFolder = path.join(apps,botId)

fs.mkdirSync(botFolder)

fs.createReadStream(zipPath)
.pipe(unzipper.Extract({ path: botFolder }))
.on("close", ()=>{

fs.unlinkSync(zipPath)

const config = readConfig(botFolder)

if(!config)
return res.send("❌ eclipse.config não encontrado")

res.json({
status:"✅ bot enviado",
id:botId,
config
})

})

})

//////////////////////////////////////////////////
// INICIAR BOT
//////////////////////////////////////////////////

app.post("/start/:id",(req,res)=>{

const id = req.params.id
const botPath = path.join(apps,id)

if(!fs.existsSync(botPath))
return res.send("❌ bot não encontrado")

const config = readConfig(botPath)

if(!config)
return res.send("❌ eclipse.config não encontrado")

const startCommand = config.START || "node index.js"

const parts = startCommand.split(" ")

const proc = spawn(parts[0], parts.slice(1),{
cwd:botPath
})

runningBots[id] = proc

proc.stdout.on("data",(data)=>{
console.log(`[BOT ${id}] ${data}`)
})

proc.stderr.on("data",(data)=>{
console.log(`[BOT ${id} ERRO] ${data}`)
})

proc.on("close",()=>{
delete runningBots[id]
console.log(`BOT ${id} finalizado`)
})

res.send("✅ bot iniciado")

})

//////////////////////////////////////////////////
// PARAR BOT
//////////////////////////////////////////////////

app.post("/stop/:id",(req,res)=>{

const id = req.params.id

if(!runningBots[id])
return res.send("❌ bot não está rodando")

runningBots[id].kill()

delete runningBots[id]

res.send("⛔ bot parado")

})

//////////////////////////////////////////////////
// LISTAR BOTS
//////////////////////////////////////////////////

app.get("/bots",(req,res)=>{

const bots = fs.readdirSync(apps)

res.json({
bots,
running:Object.keys(runningBots)
})

})

//////////////////////////////////////////////////
// SERVIDOR
//////////////////////////////////////////////////

app.listen(3000,()=>{
console.log("☁ EclipseCloud rodando na porta 3000")
})
