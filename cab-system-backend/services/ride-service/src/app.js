const express = require("express")
const mongoose = require("mongoose")

const rideRoutes = require("./routes/rideRoutes")

const app = express()

app.use(express.json())

mongoose.connect("mongodb://localhost:27017/cab-booking")
.then(()=> console.log("MongoDB connected"))

app.use("/rides", rideRoutes)

app.listen(3002, () => {
  console.log("Server running on port 3002")
})