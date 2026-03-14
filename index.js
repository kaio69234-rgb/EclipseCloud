const express = require("express")
const app = express()

app.get("/", (req, res) => {
  res.send("☁️ EclipseCloud está online!")
})

const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log("Servidor EclipseCloud iniciado na porta " + port)
})
