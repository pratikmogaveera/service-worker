const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js");
      console.log("Service Worker registered!");
    } catch (error) {
      console.error('Something went wrong while registering the service worker.');
    }
  }
};

registerServiceWorker()