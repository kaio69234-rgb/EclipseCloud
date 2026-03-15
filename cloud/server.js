const express = require("express")
const fs = require("fs")
const path = require("path")
const multer = require("multer")
const unzipper = require("unzipper")
const { spawn } = require("child_process")

const app = express()

//////////////////////////////////////////////////
// CONFIG
//////////////////////////////////////////////////

const uploads = path.join(__dirname, "uploads")
const apps = path.join(__dirname, "apps")

let runningBots = {}

//////////////////////////////////////////////////
// CRIAR PASTAS
//////////////////////////////////////////////////

if (!fs.existsSync(uploads)) fs.mkdirSync(uploads)
if (!fs.existsSync(apps)) fs.mkdirSync(apps)

//////////////////////////////////////////////////
// MIDDLEWARE
//////////////////////////////////////////////////

app.use(express.static("public"))
app.use(express.json())

//////////////////////////////////////////////////
// MULTER (UPLOAD ZIP)
//////////////////////////////////////////////////

const storage = multer.diskStorage({
destination: (req,file,cb)=>{
cb(null, uploads)
},
filename: (req,file,cb)=>{
cb(null, Date.now() + ".zip")
}
})

const upload = multer({ storage })

//////////////////////////////////////////////////
// LER eclipse.config
//////////////////////////////////////////////////

function readConfig(folder){

const configPath = path.join(folder,"eclipse.config")

if(!fs.existsSync(configPath)){
return null
}

const lines = fs.readFileSync(configPath,"utf8").split("\n")

let config = {}

lines.forEach(line=>{

if(!line.includes("=")) return

const [key,value] = line.split("=")

if(key && value){
config[key.trim()] = value.trim()
}

})

return config
}

//////////////////////////////////////////////////
// UPLOAD BOT
//////////////////////////////////////////////////

app.post("/upload", upload.single("bot"), async (req,res)=>{

try{

if(!req.file){
return res.status(400).send("❌ nenhum arquivo enviado")
}

const zipPath = req.file.path
const botId = Date.now().toString()
const botFolder = path.join(apps,botId)

fs.mkdirSync(botFolder)

await fs.createReadStream(zipPath)
.pipe(unzipper.Extract({ path: botFolder }))
.promise()

fs.unlinkSync(zipPath)

const config = readConfig(botFolder)

if(!config){
return res.status(400).send("❌ eclipse.config não encontrado")
}

res.json({
status:"✅ bot enviado",
id:botId,
config
})

}catch(err){

console.error(err)
res.status(500).send("❌ erro ao enviar bot")

}

})

//////////////////////////////////////////////////
// INICIAR BOT
//////////////////////////////////////////////////

app.post("/start/:id",(req,res)=>{

const id = req.params.id
const botPath = path.join(apps,id)

if(!fs.existsSync(botPath)){
return res.send("❌ bot não encontrado")
}

const config = readConfig(botPath)

if(!config){
return res.send("❌ eclipse.config não encontrado")
}

if(runningBots[id]){
return res.send("⚠ bot já está rodando")
}

const startCommand = config.START || "node index.js"

const parts = startCommand.split(" ")

const proc = spawn(parts[0], parts.slice(1),{
cwd:botPath,
shell:true
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

if(!runningBots[id]){
return res.send("❌ bot não está rodando")
}

runningBots[id].kill()

delete runningBots[id]

res.send("⛔ bot parado")

})

//////////////////////////////////////////////////
// LISTAR BOTS
//////////////////////////////////////////////////

app.get("/bots",(req,res)=>{

try{

const bots = fs.readdirSync(apps)

res.json({
bots,
running:Object.keys(runningBots)
})

}catch(err){

res.status(500).send("❌ erro ao listar bots")

}

})

//////////////////////////////////////////////////
// SERVIDOR
//////////////////////////////////////////////////

app.listen(3000,()=>{
console.log("☁ EclipseCloud rodando na porta 3000")
})
