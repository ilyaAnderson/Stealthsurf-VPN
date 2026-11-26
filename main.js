const faqItems = [...document.querySelectorAll(".question-answer-container")];

faqItems.forEach((item) => {
  const trigger = item.querySelector(".question-header");
  trigger?.addEventListener("click", () => {
    const wasOpen = trigger.getAttribute("aria-expanded") === "true";
    faqItems.forEach((candidate) => {
      candidate.classList.remove("clicked");
      candidate.querySelector(".question-header")?.setAttribute("aria-expanded", "false");
      candidate.querySelector(".answer-wrapper").setAttribute("aria-hidden", "true");
    });
    if (!wasOpen) {
      item.classList.add("clicked");
      trigger.setAttribute("aria-expanded", "true");
      item.querySelector(".answer-wrapper").setAttribute("aria-hidden", "false");
    }
  });
});

const demoDialog = document.querySelector("#demo-dialog");
const demoTitles = {
  console: ["Консоль не подключена", "В этой версии нет аккаунтов и рабочего личного кабинета. Это интерактивный макет для портфолио."],
  config: ["VPN-конфигурации не выдаются", "Для выдачи конфигураций нужен VPN-сервер. Здесь демонстрируется только интерфейс сайта."],
  private: ["Приватный сервер — сценарий макета", "Оформление тарифа и управление сервером не реализованы. Указанные цены служат примером."],
};

document.querySelectorAll("[data-open-demo], [data-plan]").forEach((button) => {
  button.addEventListener("click", () => {
    const plan = button.dataset.plan;
    const [title, message] = plan
      ? [`Тариф «${plan}» не продаётся`, "Тариф и цена приведены как пример. Покупка, подписка и сбор данных на сайте отключены."]
      : (demoTitles[button.dataset.openDemo] || demoTitles.console);
    document.querySelector("#demo-dialog-title").textContent = title;
    document.querySelector("#demo-dialog-message").textContent = message;
    demoDialog.showModal();
  });
});

document.querySelector("#demo-dialog-action")?.addEventListener("click", () => {
  demoDialog.close();
  if (location.hash === "#price-service") {
    document.querySelector("#price-service")?.scrollIntoView({ block: "start" });
  } else {
    location.hash = "price-service";
  }
});

demoDialog?.addEventListener("click", (event) => {
  if (event.target === demoDialog) demoDialog.close();
});
