const express = require("express")
const multer = require("multer")
const unzipper = require("unzipper")
const fs = require("fs")
const { exec } = require("child_process")

const app = express()

const upload = multer({ dest: "uploads/" })

app.post("/deploy", upload.single("bot"), async (req,res)=>{

const zipPath = req.file.path
const id = Date.now()

const botFolder = `cloud/apps/${id}`

fs.mkdirSync(botFolder,{recursive:true})

fs.createReadStream(zipPath)
.pipe(unzipper.Extract({ path: botFolder }))
.on("close",()=>{

console.log("Bot extraído")

iniciarBot(botFolder)

})

res.send("Bot enviado com sucesso")

})

function iniciarBot(folder){

const configPath = `${folder}/eclipsecloud.config`

if(!fs.existsSync(configPath)){
console.log("Config não encontrada")
return
}

const config = fs.readFileSync(configPath,"utf8")

const linhas = config.split("\n")

let dados = {}

linhas.forEach(linha=>{
let [key,value] = linha.split("=")
dados[key]=value
})

const start = dados.START || "node index.js"

console.log("Iniciando bot...")

exec(`cd ${folder} && npm install && ${start}`)

}

app.listen(3000,()=>{
console.log("EclipseCloud rodando na porta 3000")
})
