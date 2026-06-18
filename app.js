const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js");
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
    .then((response) => response.json())
    .then((json) => console.log(json));
})

registerServiceWorker()
showTime()