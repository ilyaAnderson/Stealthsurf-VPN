const profileOptions = document.querySelector("#profile-options");
const profileLocation = document.querySelector("#profile-location");
const profileProtocol = document.querySelector("#profile-protocol");

function updateProfile() {
  const options = new FormData(profileOptions);
  profileLocation.textContent = options.get("location");
  profileProtocol.textContent = options.get("protocol");
}

profileOptions.addEventListener("change", updateProfile);
window.addEventListener("pageshow", updateProfile);

const demoDialog = document.querySelector("#demo-dialog");
const dialogTitle = document.querySelector("#demo-dialog-title");
const dialogMessage = document.querySelector("#demo-dialog-message");
const dialogAction = document.querySelector("#demo-dialog-action");
const demoTitles = {
  console: ["Личный кабинет", "На главной можно посмотреть интерфейс кабинета. Вход и регистрация недоступны."],
  config: ["VPN-конфигурация", "Выбор локации и протокола меняет карточку профиля. Выдача файлов конфигурации недоступна."],
  private: ["Приватный сервер", "В тарифе предусмотрены отдельный сервер и выделенный IP. Серверы в демо не выдаются."],
};

document.querySelectorAll("[data-open-demo], [data-plan]").forEach((button) => {
  button.addEventListener("click", () => {
    const plan = button.dataset.plan;
    const [title, message] = plan
      ? [`Тариф «${plan}»`, "Цена и функции приведены для примера. Оформление подписки недоступно."]
      : demoTitles[button.dataset.openDemo];

    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    dialogAction.hidden = Boolean(plan);
    demoDialog.showModal();
  });
});

dialogAction.addEventListener("click", () => {
  demoDialog.close();
  document.querySelector("#price-title").focus({ preventScroll: true });
  document.querySelector("#price-service").scrollIntoView();
});

demoDialog.addEventListener("click", (event) => {
  if (event.target === demoDialog) demoDialog.close();
});
