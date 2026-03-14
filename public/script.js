async function uploadBot(){

const fileInput = document.getElementById("botFile")

if(!fileInput.files.length){
alert("Envie um bot .zip")
return
}

const form = new FormData()

form.append("bot", fileInput.files[0])

const res = await fetch("/upload",{
method:"POST",
body:form
})

const data = await res.json()

alert(data.status)

}
