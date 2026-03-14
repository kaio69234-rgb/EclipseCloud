const express = require("express")
const multer = require("multer")
const unzipper = require("unzipper")
const fs = require("fs")
const { exec } = require("child_process")
const path = require("path")

const app = express()

app.use(express.static("public"))
app.use(express.json())

const upload = multer({ dest: "cloud/uploads/" })

app.post("/upload", upload.single("bot"), (req, res) => {

const zipPath = req.file.path
const id = Date.now()

const botFolder = `cloud/apps/${id}`

fs.mkdirSync(botFolder, { recursive: true })

fs.createReadStream(zipPath)
.pipe(unzipper.Extract({ path: botFolder }))
.on("close", () => {

console.log("Bot extraído!")

iniciarBot(botFolder)

})

res.json({status:"Bot enviado com sucesso"})

})

function iniciarBot(folder){

const configFile = path.join(folder,"eclipsecloud.config")

if(!fs.existsSync(configFile)){
console.log("Config não encontrada")
return
}

const config = fs.readFileSync(configFile,"utf8")

let dados = {}

config.split("\n").forEach(linha=>{
let [key,value] = linha.split("=")
dados[key]=value
})

const start = dados.START || "node index.js"

console.log("Iniciando bot...")

exec(`cd ${folder} && npm install && ${start}`)

}

app.listen(3000, ()=>{
console.log("EclipseCloud rodando na porta 3000")
})
