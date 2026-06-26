const express = require('express')
const cors = require('cors')
const dotnev = require('dotenv')
const webpush = require('web-push')

dotnev.config()

const app = express()
app.use(cors())
app.use(express.json())

webpush.setVapidDetails('mailto:service-worker@test.com',
  process.env.NODE_VAPID_PUBLIC_KEY,
  process.env.NODE_VAPID_PRIVATE_KEY
)

const subscriptions = []

app.get('/', (req, res) => {
  console.log("GET: '/' endpoint called.")
  res.send({ success: true })
})

app.post('/subscribe', (req, res) => {
  console.log("POST: '/subscribe' endpoint called.")
  subscriptions.push(req.body)
  res.send({ success: true, message: "Your subscription has been registered." })
})

app.post('/push', async (req, res) => {
  if (subscriptions.length) {
    await Promise.all(subscriptions.map(sub => webpush.sendNotification(sub, JSON.stringify(req.body))))
    res.status(200).send({ success: true, message: "Notifications sent" })
  } else {
    res.status(400).send({ success: false, message: "There are no subscriptions to send notifications to." })
  }
})

app.listen(process.env.NODE_PORT, () => {
  console.log(`Express server running on port:${process.env.NODE_PORT || 3001}`)
})