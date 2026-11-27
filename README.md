# Stealthsurf VPN — адаптивный концепт лендинга

Интерактивный гид по VPN на HTML, CSS, JavaScript и Three.js. Страница показывает путь пакета от телефона до сервера.

**Демо:** https://ilyaanderson.github.io/Stealthsurf-VPN/

## Возможности

- 3D-сцены с разъёмом RJ45, смартфоном, роутером и разборным стоечным сервером.
- Виджет VPN меняет состояние при прокрутке и по кнопкам. Для браузеров без WebGL предусмотрены статичные изображения моделей.
- Демонстрационные тарифы с разным набором функций.
- Доступный FAQ-аккордеон с управлением клавиатурой.
- Диалоги для сценариев тарифа, консоли и конфигурации.
- Учитывается системная настройка уменьшения анимации.

Это только фронтенд-макет: VPN-соединения, серверов, аккаунтов, выдачи конфигураций и оплаты нет. Указанные тарифы и цены — примеры.

## Запуск

Запустите из корня проекта:

```bash
python3 -m http.server 8000
```

Перейдите на http://localhost:8000.

---

# Stealthsurf VPN — responsive landing page concept

An interactive VPN guide built with HTML, CSS, JavaScript, and Three.js. Scroll through a connection demo and explore the Ethernet connector, home router, and server teardown. Image fallbacks are provided for browsers without WebGL.

**Live demo:** https://ilyaanderson.github.io/Stealthsurf-VPN/

No VPN backend, servers, accounts, configuration delivery, or payments are connected. Prices are examples for the portfolio mockup.

Run `python3 -m http.server 8000` from the project root and open http://localhost:8000.
