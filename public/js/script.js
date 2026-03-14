function uploadBot(){

const fileInput = document.getElementById("botFile")

if(!fileInput.files.length){
alert("Selecione um bot .zip primeiro")
return
}

const formData = new FormData()
formData.append("bot", fileInput.files[0])

fetch("/upload",{
method:"POST",
body:formData
})
.then(res=>res.text())
.then(data=>{
alert(data)
})

}

function startBot(){

fetch("/start")
.then(res=>res.text())
.then(data=>{
document.getElementById("botStatus").innerText = "Status: Bot rodando"
alert(data)
})

}

function stopBot(){

fetch("/stop")
.then(res=>res.text())
.then(data=>{
document.getElementById("botStatus").innerText = "Status: Bot parado"
alert(data)
})

}
