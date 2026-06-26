const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', { type: 'module' })

      console.log("Service Worker registered!");
    } catch (error) {
      console.error('Something went wrong while registering the service worker.', error);
    }
  }
};

const getIstTime = async () => {
  const res = await fetch('https://time.now/developer/api/timezone/Asia/Kolkata')
  const data = await res.json()
  const [date, time] = data.datetime.split('T')
  return `${date} : ${time.split('.')[0]}`
}

const showTime = async () => {
  const element = document.getElementsByClassName('time')
  element[0].textContent = await getIstTime()
}

const form = document.getElementById('form-container')
form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const input = document.getElementById('name')

  fetch('https://jsonplaceholder.typicode.com/users', {
    method: 'POST',
    body: JSON.stringify({
      name: input.value
    }),
    headers: {
      'Content-type': 'application/json; charset=UTF-8',
    },
  })
    .then((response) => {
      if (!response.ok)
        throw new Error(`Request failed: ${response.status}`)
      return response.json()
    })
    .then((json) => console.log(json))
    .catch((error) => console.log('Something went wrong while submitting the form.', error.message))
})

const subscribeButton = document.getElementsByClassName('subscribe-button')[0]
subscribeButton.addEventListener('click', async (e) => {
  e.preventDefault()
  // permission = 'granted', 'denied', and 'default'
  const notificationPermission = await Notification.requestPermission()
  if (notificationPermission === 'granted') {
    const swReady = await navigator.serviceWorker.ready
    if (swReady) {
      const subscription = await swReady.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: "BE8Xlntkui9zazwV6y7LFife9p_18MXcBAdH3Yj1J8yxZ_pHILaOrlE_G46HnXZ1IN3zeZjTA-k0GBmu-NYYic4"
      })

      console.log("Subscription:", subscription)
      const subscribeResponse = await fetch('http://localhost:3001/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

})

registerServiceWorker()
showTime()