const express = require("express")
const fs = require("fs")
const path = require("path")
const multer = require("multer")
const unzipper = require("unzipper")
const cors = require("cors")
const { spawn } = require("child_process")

const session = require("express-session")
const passport = require("passport")
const DiscordStrategy = require("passport-discord").Strategy

const compression = require("compression")
const rateLimit = require("express-rate-limit")

const app = express()

//////////////////////////////////////////////////
// CONFIG
//////////////////////////////////////////////////

const PORT = process.env.PORT || 3000

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || "1482561610798071899"
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || "QDbKAyWgUmQxLUrbfstrMcii_iwlp2B6"

const DOMAIN = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`
const DISCORD_CALLBACK = `${DOMAIN}/auth/discord/callback`

//////////////////////////////////////////////////
// PATHS
//////////////////////////////////////////////////

const uploads = path.join(__dirname,"uploads")
const apps = path.join(__dirname,"apps")
const database = path.join(__dirname,"database")

const usersFile = path.join(database,"users.json")

let runningBots = {}

//////////////////////////////////////////////////
// CRIAR PASTAS
//////////////////////////////////////////////////

if(!fs.existsSync(uploads)) fs.mkdirSync(uploads,{recursive:true})
if(!fs.existsSync(apps)) fs.mkdirSync(apps,{recursive:true})
if(!fs.existsSync(database)) fs.mkdirSync(database,{recursive:true})

if(!fs.existsSync(usersFile)){
fs.writeFileSync(usersFile,JSON.stringify([],null,2))
}

//////////////////////////////////////////////////
// FUNÇÃO SEGURA LER USERS
//////////////////////////////////////////////////

function getUsers(){

try{

const data = fs.readFileSync(usersFile)

return JSON.parse(data)

}catch{

return []

}

}

function saveUsers(users){

fs.writeFileSync(usersFile,JSON.stringify(users,null,2))

}

//////////////////////////////////////////////////
// MIDDLEWARE
//////////////////////////////////////////////////

app.use(cors())

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(express.static(path.join(__dirname,"public")))

app.use(compression())

const limiter = rateLimit({
windowMs: 15 * 60 * 1000,
max: 200,
standardHeaders:true,
legacyHeaders:false
})

app.use(limiter)

app.use(session({
secret:"eclipsecloud_secret",
resave:false,
saveUninitialized:false,
cookie:{
maxAge:86400000,
secure:false
}
}))

app.use(passport.initialize())
app.use(passport.session())

//////////////////////////////////////////////////
// PASSPORT DISCORD
//////////////////////////////////////////////////

passport.serializeUser((user,done)=>{
done(null,user)
})

passport.deserializeUser((obj,done)=>{
done(null,obj)
})

passport.use(new DiscordStrategy({

clientID: DISCORD_CLIENT_ID,
clientSecret: DISCORD_CLIENT_SECRET,
callbackURL: DISCORD_CALLBACK,
scope:["identify","email"]

},

(accessToken,refreshToken,profile,done)=>{

let users = getUsers()

let user = users.find(u=>u.id === profile.id)

if(!user){

user={
id:profile.id,
username:profile.username,
avatar:profile.avatar,
bots:[],
created:Date.now()
}

users.push(user)

saveUsers(users)

console.log("👤 Novo usuário:",profile.username)

}

return done(null,user)

}))

//////////////////////////////////////////////////
// AUTH
//////////////////////////////////////////////////

function checkAuth(req,res,next){

if(req.isAuthenticated()) return next()

return res.redirect("/login.html")

}

//////////////////////////////////////////////////
// LOGIN
//////////////////////////////////////////////////

app.get("/auth/discord",
passport.authenticate("discord"))

app.get("/auth/discord/callback",

passport.authenticate("discord",{failureRedirect:"/"}),

(req,res)=>{

console.log("🔐 Login:",req.user.username)

res.redirect("/dashboard")

})

app.get("/logout",(req,res)=>{

if(req.logout){
req.logout(()=>{
res.redirect("/")
})
}else{
res.redirect("/")
}

})

//////////////////////////////////////////////////
// DASHBOARD
//////////////////////////////////////////////////

app.get("/dashboard",checkAuth,(req,res)=>{

res.json({
user:req.user,
runningBots:Object.keys(runningBots)
})

})

//////////////////////////////////////////////////
// UPLOAD BOT
//////////////////////////////////////////////////

const storage = multer.diskStorage({

destination:(req,file,cb)=>{
cb(null,uploads)
},

filename:(req,file,cb)=>{
cb(null,Date.now()+".zip")
}

})

const upload = multer({

storage,

limits:{
fileSize:50 * 1024 * 1024
}

})

app.post("/upload",checkAuth,upload.single("bot"),async(req,res)=>{

if(!req.file) return res.send("Nenhum arquivo enviado")

const zipPath=req.file.path
const botId=Date.now().toString()
const botFolder=path.join(apps,botId)

fs.mkdirSync(botFolder,{recursive:true})

await fs.createReadStream(zipPath)
.pipe(unzipper.Extract({path:botFolder}))
.promise()

fs.unlinkSync(zipPath)

if(!fs.existsSync(path.join(botFolder,"index.js"))){

fs.rmSync(botFolder,{recursive:true,force:true})

return res.send("Arquivo index.js não encontrado")

}

let users = getUsers()

let user = users.find(u=>u.id === req.user.id)

if(user){

user.bots.push(botId)

saveUsers(users)

}

console.log("📦 Bot enviado:",botId)

res.json({
status:"Bot enviado",
id:botId
})

})

//////////////////////////////////////////////////
// START BOT
//////////////////////////////////////////////////

app.post("/start/:id",checkAuth,(req,res)=>{

const id=req.params.id
const botPath=path.join(apps,id)

if(!fs.existsSync(botPath))
return res.send("Bot não encontrado")

if(runningBots[id])
return res.send("Bot já rodando")

const proc=spawn("node",["index.js"],{
cwd:botPath
})

runningBots[id]=proc

proc.stdout.on("data",data=>{
console.log(`[BOT ${id}] ${data}`)
})

proc.stderr.on("data",data=>{
console.log(`[BOT ${id} ERRO] ${data}`)
})

proc.on("close",()=>{

delete runningBots[id]

console.log("🛑 Bot finalizado:",id)

})

console.log("🚀 Bot iniciado:",id)

res.send("Bot iniciado")

})

//////////////////////////////////////////////////
// STOP BOT
//////////////////////////////////////////////////

app.post("/stop/:id",checkAuth,(req,res)=>{

const id=req.params.id

if(!runningBots[id])
return res.send("Bot não está rodando")

runningBots[id].kill()

delete runningBots[id]

console.log("🛑 Bot parado:",id)

res.send("Bot parado")

})

//////////////////////////////////////////////////
// LISTAR BOTS
//////////////////////////////////////////////////

app.get("/bots",checkAuth,(req,res)=>{

let users = getUsers()

let user = users.find(u=>u.id === req.user.id)

if(!user) return res.json({bots:[]})

res.json({
bots:user.bots,
running:Object.keys(runningBots)
})

})

//////////////////////////////////////////////////
// STATUS
//////////////////////////////////////////////////

app.get("/status",(req,res)=>{

res.json({

uptime:process.uptime(),
botsRodando:Object.keys(runningBots).length,
memoria:process.memoryUsage()

})

})

//////////////////////////////////////////////////
// ANTI CRASH
//////////////////////////////////////////////////

process.on("uncaughtException",err=>{
console.log("Erro:",err)
})

process.on("unhandledRejection",err=>{
console.log("Promise erro:",err)
})

//////////////////////////////////////////////////
// SERVER
//////////////////////////////////////////////////

app.listen(PORT,()=>{

console.log("☁ EclipseCloud rodando na porta "+PORT)
console.log("🌐 Painel:",DOMAIN)

})
