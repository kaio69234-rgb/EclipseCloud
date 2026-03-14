async function uploadBot(){

const file = document.getElementById("botFile").files[0]

if(!file){
alert("Escolha um arquivo")
return
}

const form = new FormData()

form.append("bot",file)

await fetch("/upload",{method:"POST",body:form})

alert("Bot enviado")

}

async function startBot(){

await fetch("/start")

document.getElementById("botStatus").innerText="Status: Bot rodando"

}

async function stopBot(){

await fetch("/stop")

document.getElementById("botStatus").innerText="Status: Bot parado"

}
