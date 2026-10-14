import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { analyticsOn } from '../lib/analytics'
import { useT } from '../lib/i18n'

// Plain-language privacy notice. Keep it in line with what the app actually does.
const TEXT = {
  en: {
    title: 'Privacy',
    updated: 'Updated 12 October 2026',
    sections: [
      ['In short', 'No account, no ads, no cookies, no tracking of you. What you enter about your family stays on your phone.'],
      ['What stays on your phone', 'Your child’s name, birthday and nap time, your favourites, notes, visits, town, language and settings are saved only in this browser or app on your device. We never receive them. You can delete them any time with “Delete all my data” in Me → Family, or by clearing the app’s data.'],
      ['Your location', 'If you tap “Near me” or “Use my location”, your phone shares your position with the app to sort places and pick your town. It is used on your device only and is not sent to us or anyone else.'],
      ['Services the app contacts', 'Weather comes from Open-Meteo, which receives the coordinates of the town you chose (not your own position). Maps come from OpenFreeMap (OpenStreetMap data), place photos from the places’ own websites and Wikimedia Commons; like any website they see your IP address when your phone loads them. The app and its data are hosted on GitHub Pages, which keeps standard server logs. Links to websites, maps, calendars and phone numbers open other apps under their own privacy rules.'],
      ['Notifications (iOS app)', 'The optional weekend reminder is scheduled on your phone. No push service or server is involved.'],
      ['Children', 'The app is for parents. It does not collect information from or about children beyond what you choose to type, which stays on your device.'],
      ['Information about places', 'Place details come from public sources (official websites, OpenStreetMap, Stebby’s public search) and can be out of date. Always confirm prices and opening hours before you go.'],
    ],
    stats: ['Visitor counts', 'We use Plausible Analytics to count visits and a few actions (for example “We went today” on a place). It uses no cookies, stores nothing on your phone and does not collect personal data; visitors cannot be identified or followed across sites. The data is kept in the EU.'],
  },
  et: {
    title: 'Privaatsus',
    updated: 'Uuendatud 12. oktoobril 2026',
    sections: [
      ['Lühidalt', 'Kontot, reklaame, küpsiseid ega sinu jälgimist ei ole. Mida oma pere kohta sisestad, jääb sinu telefoni.'],
      ['Mis jääb sinu telefoni', 'Lapse nimi, sünnipäev ja uneaeg, lemmikud, märkmed, külastused, linn, keel ja seaded salvestatakse ainult selles brauseris või äpis sinu seadmes. Meie neid ei saa. Saad need igal ajal kustutada nupuga „Kustuta kõik minu andmed“ (Mina → Pere) või äpi andmeid tühjendades.'],
      ['Sinu asukoht', 'Kui vajutad „Minu lähedal“ või „Kasuta minu asukohta“, jagab telefon asukohta äpiga, et kohti sortida ja linn valida. Seda kasutatakse ainult sinu seadmes ega saadeta meile ega kellelegi teisele.'],
      ['Teenused, millega äpp ühendub', 'Ilmaandmed tulevad Open-Meteost, mis saab valitud linna koordinaadid (mitte sinu asukoha). Kaardid tulevad OpenFreeMapist (OpenStreetMapi andmed), kohtade fotod kohtade endi veebilehtedelt ja Wikimedia Commonsist; nagu iga veebileht, näevad nad laadimisel sinu IP-aadressi. Äpp ja selle andmed asuvad GitHub Pagesis, mis peab tavapäraseid serverilogisid. Lingid veebilehtedele, kaartidele, kalendritele ja telefoninumbritele avavad teisi äppe nende oma privaatsusreeglitega.'],
      ['Teavitused (iOS-äpp)', 'Valikuline nädalavahetuse meeldetuletus ajastatakse sinu telefonis. Tõuketeenust ega serverit ei kasutata.'],
      ['Lapsed', 'Äpp on mõeldud vanematele. See ei kogu lastelt ega laste kohta andmeid peale selle, mida ise sisestad ja mis jääb sinu seadmesse.'],
      ['Kohtade info', 'Kohtade andmed pärinevad avalikest allikatest (ametlikud veebilehed, OpenStreetMap, Stebby avalik otsing) ja võivad olla aegunud. Kontrolli hindu ja lahtiolekuaegu alati enne minekut.'],
    ],
    stats: ['Külastuste loendus', 'Kasutame Plausible Analyticsit, et lugeda külastusi ja mõnda tegevust (näiteks „Käisime täna“ koha lehel). See ei kasuta küpsiseid, ei salvesta midagi sinu telefoni ega kogu isikuandmeid; külastajaid ei saa tuvastada ega teistel lehtedel jälgida. Andmeid hoitakse EL-is.'],
  },
  ru: {
    title: 'Конфиденциальность',
    updated: 'Обновлено 12 октября 2026',
    sections: [
      ['Коротко', 'Без аккаунта, рекламы, cookies и слежки за вами. Всё, что вы вводите о семье, остаётся на вашем телефоне.'],
      ['Что хранится на телефоне', 'Имя ребёнка, день рождения и время сна, избранное, заметки, посещения, город, язык и настройки сохраняются только в этом браузере или приложении на вашем устройстве. Мы их не получаем. Их можно удалить в любой момент кнопкой «Удалить все мои данные» (Я → Семья) или очистив данные приложения.'],
      ['Ваше местоположение', 'Если вы нажимаете «Рядом со мной» или «Определить по местоположению», телефон передаёт приложению вашу позицию, чтобы отсортировать места и выбрать город. Она используется только на устройстве и никуда не отправляется.'],
      ['Сервисы, к которым обращается приложение', 'Погода — от Open-Meteo, который получает координаты выбранного города (не ваши). Карты — от OpenFreeMap (данные OpenStreetMap), фото мест — с сайтов самих мест и Wikimedia Commons; как любой сайт, они видят ваш IP-адрес при загрузке. Приложение и данные размещены на GitHub Pages, где ведутся обычные серверные журналы. Ссылки на сайты, карты, календари и телефоны открывают другие приложения с их собственными правилами.'],
      ['Уведомления (iOS-приложение)', 'Необязательное напоминание о выходных планируется на вашем телефоне. Push-сервисы и серверы не используются.'],
      ['Дети', 'Приложение предназначено для родителей. Оно не собирает данные от детей или о детях, кроме того, что вы сами вводите и что остаётся на устройстве.'],
      ['Информация о местах', 'Данные о местах взяты из открытых источников (официальные сайты, OpenStreetMap, открытый поиск Stebby) и могут устареть. Всегда уточняйте цены и часы работы перед походом.'],
    ],
    stats: ['Подсчёт посещений', 'Мы используем Plausible Analytics, чтобы считать посещения и несколько действий (например, «Мы сегодня были» на странице места). Он не использует cookies, ничего не хранит на телефоне и не собирает личные данные; посетителей нельзя опознать или отследить на других сайтах. Данные хранятся в ЕС.'],
  },
}

export function Privacy() {
  const { t, lang } = useT()
  const navigate = useNavigate()
  const c = TEXT[lang === 'fi' ? 'en' : lang]
  return (
    <div className="page prose">
      <div className="title-row">
        <button className="icon-button plain" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/me?tab=family'))} aria-label={t('Back')}>
          <ArrowLeft size={20} />
        </button>
      </div>
      <h1 className="page-title">{c.title}</h1>
      <p className="muted small">{c.updated}</p>
      {(analyticsOn ? [...c.sections.slice(0, 3), c.stats, ...c.sections.slice(3)] : c.sections).map(([h, body]) => (
        <section key={h}>
          <h2>{h}</h2>
          <p>{body}</p>
        </section>
      ))}
    </div>
  )
}
