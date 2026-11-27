const navToggle = document.querySelector('.nav-toggle');
const menu = document.querySelector('#menu');
function setMenu(open) {
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.classList.toggle('is-open', open);
}
navToggle.addEventListener('click', () => setMenu(navToggle.getAttribute('aria-expanded') !== 'true'));
menu.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        navToggle.focus();
    }
});

const dialog = document.querySelector('#demo-dialog');
const details = document.querySelector('#demo-details');
const consoleImage = document.querySelector('#console-image');
const examples = {
    'Старт': ['Один профиль с общим IP-адресом. Протокол выбирается при создании профиля.', '69 ₽ в год'],
    'Плюс': ['Профили для нескольких устройств, подбор локации и фильтр рекламы.', '199 ₽ в год'],
    'Приватный': ['Отдельный сервер с выделенным IP-адресом и собственными настройками доступа.', '1 790 ₽ в год'],
};
function detail(label, value) {
    const row = document.createElement('div');
    const key = document.createElement('dt');
    const item = document.createElement('dd');
    key.textContent = label;
    item.textContent = value;
    row.append(key, item);
    details.append(row);
}
document.querySelectorAll('[data-open-demo], [data-plan]').forEach(button => {
    button.addEventListener('click', () => {
        const plan = button.dataset.plan;
        const kind = button.dataset.openDemo;
        let title = 'Консоль StealthSurf';
        let copy = 'Здесь собраны профили подключения. Выберите локацию и протокол, затем импортируйте профиль в клиент.';
        details.replaceChildren();
        consoleImage.hidden = kind !== 'console';
        if (plan) {
            title = plan;
            copy = examples[plan][0];
            detail('Пример стоимости', examples[plan][1]);
        } else if (kind === 'config') {
            title = 'VPN-профиль';
            copy = 'Пример параметров, с которыми приложение обращается к серверу.';
            detail('Локация', 'Амстердам');
            detail('Протокол', 'WireGuard');
            detail('Адрес для примера', 'vpn.example.com');
        }
        document.querySelector('#demo-dialog-title').textContent = title;
        document.querySelector('#demo-dialog-message').textContent = copy;
        dialog.showModal();
    });
});
dialog.addEventListener('click', event => {
    const {left, top, right, bottom} = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < left || event.clientX > right
        || event.clientY < top || event.clientY > bottom)) dialog.close();
});
