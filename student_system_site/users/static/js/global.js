document.addEventListener("DOMContentLoaded", function () {
  console.log("Current URL:", window.location.href);

  // Push to history only if it's a new navigation
  if (!sessionStorage.getItem("firstLoad")) {
      history.replaceState({ page: window.location.href }, "", window.location.href);
      sessionStorage.setItem("firstLoad", true);
  }

  window.addEventListener("popstate", function (event) {
      console.log("Navigated back or forward to:", window.location.href);
  });
});
