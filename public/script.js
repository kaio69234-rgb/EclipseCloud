function iniciarBot(){
fetch("/start")
.then(res=>res.text())
.then(msg=>{
alert(msg)
})
}

function pararBot(){
fetch("/stop")
.then(res=>res.text())
.then(msg=>{
alert(msg)
})
}
