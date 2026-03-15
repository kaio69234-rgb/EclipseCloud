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

const app = express()

//////////////////////////////////////////////////
// CONFIG
//////////////////////////////////////////////////

const PORT = 3000

const uploads = path.join(__dirname,"../uploads")
const apps = path.join(__dirname,"../apps")
const database = path.join(__dirname,"../database")

const usersFile = path.join(database,"users.json")

let runningBots = {}

//////////////////////////////////////////////////
// CRIAR PASTAS
//////////////////////////////////////////////////

if(!fs.existsSync(uploads)) fs.mkdirSync(uploads)
if(!fs.existsSync(apps)) fs.mkdirSync(apps)
if(!fs.existsSync(database)) fs.mkdirSync(database)
if(!fs.existsSync(usersFile)) fs.writeFileSync(usersFile,"[]")

//////////////////////////////////////////////////
// MIDDLEWARE
//////////////////////////////////////////////////

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname,"../public")))

app.use(session({
secret:"eclipsecloud_secret",
resave:false,
saveUninitialized:false
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

clientID:"SEU_CLIENT_ID",
clientSecret:"SEU_CLIENT_SECRET",
callbackURL:"http://localhost:3000/auth/discord/callback",
scope:["identify","email"]

},

(accessToken,refreshToken,profile,done)=>{

let users = JSON.parse(fs.readFileSync(usersFile))

let user = users.find(u=>u.id === profile.id)

if(!user){

user={
id:profile.id,
username:profile.username,
avatar:profile.avatar,
bots:[]
}

users.push(user)

fs.writeFileSync(usersFile,JSON.stringify(users,null,2))

}

return done(null,user)

}))

//////////////////////////////////////////////////
// AUTH MIDDLEWARE
//////////////////////////////////////////////////

function checkAuth(req,res,next){

if(req.isAuthenticated()) return next()

res.redirect("/login.html")

}

//////////////////////////////////////////////////
// ROTAS LOGIN
//////////////////////////////////////////////////

app.get("/auth/discord",
passport.authenticate("discord"))

app.get("/auth/discord/callback",

passport.authenticate("discord",{
failureRedirect:"/"
}),

(req,res)=>{
res.redirect("/dashboard")
})

app.get("/logout",(req,res)=>{
req.logout(()=>{
res.redirect("/")
})
})

//////////////////////////////////////////////////
// DASHBOARD
//////////////////////////////////////////////////

app.get("/dashboard",checkAuth,(req,res)=>{

res.json({
user:req.user
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

const upload = multer({storage})

app.post("/upload",checkAuth,upload.single("bot"),async(req,res)=>{

const zipPath=req.file.path
const botId=Date.now().toString()
const botFolder=path.join(apps,botId)

fs.mkdirSync(botFolder)

await fs.createReadStream(zipPath)
.pipe(unzipper.Extract({path:botFolder}))
.promise()

fs.unlinkSync(zipPath)

let users = JSON.parse(fs.readFileSync(usersFile))

let user = users.find(u=>u.id === req.user.id)

user.bots.push(botId)

fs.writeFileSync(usersFile,JSON.stringify(users,null,2))

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
cwd:botPath,
shell:true
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
})

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

res.send("Bot parado")

})

//////////////////////////////////////////////////
// LISTAR BOTS
//////////////////////////////////////////////////

app.get("/bots",checkAuth,(req,res)=>{

let users = JSON.parse(fs.readFileSync(usersFile))

let user = users.find(u=>u.id === req.user.id)

res.json({
bots:user.bots
})

})

//////////////////////////////////////////////////
// SERVER
//////////////////////////////////////////////////

app.listen(PORT,()=>{
console.log("☁ EclipseCloud rodando na porta "+PORT)
})
