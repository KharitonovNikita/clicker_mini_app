'use client';

import { useCallback, useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';

// ========================
// ТИПЫ
// ========================


/*
Интерфейс, который отвечает за состояние внутреигровых элементов
В текущей сессии
*/


interface GameState {
  balance: number; // Текущие деньги  игрока | Показ реального количество монет на экране
  clicks: number; // Сколько раз игрок кликнул за эту сессию

  clickPower: number; // Сколько монет даёт один клик сейчас
  clickPowerLevel: number; // Уровень улучшения «Сила клика» (визуально и для расчёта цены)

  autoClicker: number; // Сколько монет в секунду приносит автокликер сейчас
  autoClickerLevel: number; // Уровень улучшения «Автокликер» (визуально и для расчёта цены)
} 



/*
Эти данные приходят прямо от Telegram через объект: window.Telegram.WebApp.initDataUnsafe.user
То есть, когда пользователь открывает  Mini App, Telegram автоматически передаёт информацию о нём в безопасном виде.

Откуда берётся? - Прямо из Telegram 

Когда обновляется? - При каждом запуске Mini App
*/

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}


/* 
Полная карточка игрока
Откуда берётся? - Из твоей базы (localStorage / сервер)
Когда обновляется? - Только ты сам её обновляешь

*/

interface UserStats {
  userId: number; // Уникальный ID пользователя из Telegram
  username?: string; // Ник в Telegram
  firstName: string;
  lastName?: string;
  totalClicks: number; // Сколько раз игрок кликнул за всё время
  totalBalance: number; // Сколько монет у игрока сейчас
  clickPowerLevel: number; // Уровень улучшения "Сила клика" (1 клик = X монет)
  autoClickerLevel: number; // Уровень автокликера (монеты в секунду)
  gamesPlayed: number; // Сколько раз игрок запускал игру (сессий) | Для достижений, аналитики
  lastActive: string; // Дата и время последнего действия (ISO формат)
  joinDate: string; // Когда игрок впервые запустил игру
}



/* Единая база всех игроков в игре в JSON формате*/ 
interface UsersData {
  users: Record <string,UserStats>; // Все игроки, где ключ — userId (строка), а значение — его UserStats
  lastUpdated: string; // Последнее обновление базы
}





// ========================
// АНИМАЦИИ И СТИЛИ
// ========================

const pulse = keyframes`
  0%   { transform: scale(1); }
  50%  { transform: scale(1.05); }
  100% { transform: scale(1); }
`;




/* Главный контейнер приложения*/

const Container = styled.div`
  display: flex;
  flex-direction: column; // Задание оси, вдоль в которой flex контейнер автоматически растягивается 
  min-height: 100vh;
  gap: 20px; // Задаёт расстояние между дочерними элементами flex-контейнера.
  padding: 10px;
  overflow-y: auto; // Управляет вертикальной прокруткой. Если надо - то прокрутчиваем
`;


/* Заголовок с карточками статистики - Баланс / Клики */
const Header = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
  margin-top: 10px;
`;


/* Стиль карточек внутри нашего кликера - Баланс / Клики*/

const Card = styled.div`
  background-color: #ffeb3b;
  padding: 14px 10px;
  border-radius: 15px;
  text-align: center; // Горизонтальное выравнивание строчного (inline) содержимого внутри блока 
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;

/* Стиль текста наших карточек -  Баланс / Клики */
const CardTitle = styled.h2`
  font-size: 16px;
  margin-bottom: 8px;
  color: #000000;
`;

/* Стиль текста значений в наших карточках -  Баланс / Клики */
const CardValue = styled.div`
  font-size: 22px;
  font-weight: bold;
  color: #000000;
`;














/* Стиль невидимого контейнера нашей кнопки - кликера */
const MainButtonContainer = styled.div`
  flex: 1; // Занятие всей доступной ширины
  display: flex;
  justify-content: center; // Выравниванием элементов вдоль главной оси [ Горизонтальной ] flex-контейнера
  align-items: center; // Выравниванием элементов вдоль поперечной оси [ Вертикальной  ] flex-контейнера
  padding: 20px;
`;

/* Сама кнопка, на которую мы будем кликать */
const ClickButton = styled.button<{ $isAnimating?: boolean }>` // Принимаем проп только для стилей и в DOM не пускаем
  width: 140px;
  height: 140px;
  background-color: #ffeb3b;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  transition: transform 0.1s ease;
  transform: ${props => props.$isAnimating ? 'scale(0.95)' : 'scale(1)'};  // Если сейчас кнопка анимируется (нажата) — уменьши её до 95%, Иначе — оставь в нормальном размере (100%)

  &:hover {
    transform: ${props => props.$isAnimating ? 'scale(0.95)' : 'scale(1.05)'}; // При наведении и пользователь нажал - 0.95. При наведении и не нажал - (1.05
  }

`;
/* Стили текста кнопки */

const ButtonText = styled.span`
  font-size: 18px;
  font-weight: bold;
  color: #000000;
`;

/* Сетка, в которой будут располагаться карточки с улучешниями*/
const Upgrades = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 40px;
`;

/* Для карточек улучшений - не дизайн самой карточки, а то, как будут располагаться тексты внутри*/
const UpgradeCard = styled(Card)`
  text-align: center;
  padding: 12px 10px;
`;

/* Стиль текста заголовка карточки улучшения*/
const UpgradeTitle = styled.h3`
  font-size: 16px;
  margin-bottom: 10px;
  color: #000000;
`;



/* Текст стиля текста улучшения*/
const UpgradeInfo = styled.div`
  display: flex;
  justify-content: space-between; // flex-элементы равномерно распределяются по главной оси, и промежутки между ними заполняются равномерно
  margin-bottom: 10px;
  font-size: 13px;
`;


/* Стиль кнопки улучшения */

const UpgradeButton = styled.button`
  background-color: #ffffff;
  color: #000000;
  border: 2px solid #000000;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: bold;
  width: 100%;
  max-width: 100px;

  &:disabled { // Отключённые элементы 
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;



// ========================
// Приветственный экран
// ========================

/* Стиль экрана приветсвенного окна с анимацей pulse, который мы писали ранее*/
const WelcomeOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #ffeb3b 0%, #fff176 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  animation: ${pulse} 2s ease-in-out infinite;
`;



const WelcomeText = styled.h1` font-size: 32px; color: #000; `;
const WelcomeSubtitle = styled.p` font-size: 18px; margin: 20px 0; text-align: center; padding: 0 20px; `;
const StartButton = styled.button`
  background-color: #000;
  color: #ffeb3b;
  border: none;
  padding: 15px 30px;
  border-radius: 25px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
`;
const UserInfo = styled.div` /* ... */ `; //  контейнер для информации о пользователе
const UserName = styled.div` /* ... */ `; // элемент для отображения имени пользователя
const UserId = styled.div` /* ... */ `; // элемент для отображения ID пользователя








// ========================
// ОСНОВНОЙ КОМПОНЕНТ
// ========================

export default function GameContainer() {
  // Игровое состояние
  const [gameState, setGameState] = useState<GameState>({
    balance: 0,
    clicks: 0,
    clickPower: 1,
    clickPowerLevel: 0,
    autoClicker: 0,
    autoClickerLevel: 0,
  });

  // UI состояния
  const [isButtonAnimating, setIsButtonAnimating] = useState(false); // Отслеживание нажатия кнопки
  const [showWelcome, setShowWelcome] = useState(false); // Показывать или скрывать приветственный экран при первом запуске | По умолчанию - показываем
  const [isTelegramReady, setIsTelegramReady] = useState(false); // Защита от ошибок при работе с Telegram WebApp
 
  // Пользователь Telegram
  const [user, setUser] = useState<TelegramUser | null>(null);

  // Глобальная статистика всех игроков
  const [usersData, setUsersData] = useState<UsersData>({
    users: {},
    lastUpdated: new Date().toISOString(),
  });




  // ========================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ API - Функции для работы с пользовательскими данными через API
  // ========================

  // Функция, которую мы будем вызывать, когда захотим загрузить статистику всех игроков.
  // Я — функция, которая постепенно (асинхронно) загрузит данные игроков
  const loadUsersData = useCallback(async (): Promise<UsersData> => {
    try {
      // Запрос к серверу
      const response = await fetch('/api/users/stats'); // fetch идёт за данными, а await ждет пока не вернет промис типа <Response>. «Подожди здесь, пока не придёт ответ, но не замораживай всё приложение»
      if (response.ok) {
        const result = await response.json(); //Читает тело HTTP-ответа и преобразует его из JSON-строки в массив Только здесь появляются  данные!

        // Cервер, скорее всего, отдал нам массив игроков в поле result.data.topPlayers пар ключ - значение.  Но нам в состоянии нужен не массив, а объект, где ключ — это строковый userId, а значение — вся статистика игрока. 
        return {
          users: Object.fromEntries( // база users теперь будет объектом, который превратился из массива пар ключ - значение
            // У переменной, которая ответ от сервера - есть свойство - data, которое содержит всю необходимую информацию
            // topPlayers — это свойство внутри data
            result.data.topPlayers.map((u: any) => [u.userId.toString(), u])  // topPlayers — массив игроков (каждый элемент — объект игрока).
            // Взяли и разбили массив на объект
          ),
          lastUpdated: result.data.lastUpdated, // В data будет lastUpdated
        };
      }
      throw new Error('Server error');
    } catch (error) {
      console.error('Ошибка загрузки с сервера, пробуем localStorage');
      try {
        const saved = localStorage.getItem('miniClickerUsersData');

        // чем отличается JSON.parse и response.json()
        return saved ? JSON.parse(saved) : { users: {}, lastUpdated: new Date().toISOString() }; // Если saved есть (не null) → 
        //  преврати строку обратно в объект через JSON.parse() и верни его Иначе → е→ верни пустую базу игроков, но с текущей датой
      } catch {
        return { users: {}, lastUpdated: new Date().toISOString() }; // Доп. обработка ошибок
      }
    }
  }, []);


  // Отправить статистику текущего игрока текущей сессии
  const saveUsersData = useCallback(async (data: UsersData) => { // Принимаем Базу
    try {
      if (user) {
        await fetch('/api/users/stats', { // по API который хранит
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-telegram-user-id': user.id.toString() }, //  данные в формате JSON
          body: JSON.stringify({
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
            gameStats: { // gameStats  - на  апи название такое. Текущие показатели сессии
              clicks: gameState.clicks,
              balance: gameState.balance,
              clickPowerLevel: gameState.clickPowerLevel,
              autoClickerLevel: gameState.autoClickerLevel,
            },
          }),
        });
      }
    } catch (error) {
      console.error('Ошибка сохранения на сервер:', error);
    }

    // Помещаем локально в localStorage
    try {

      // localStorage хранит только строки
      localStorage.setItem('miniClickerUsersData', JSON.stringify(data)); // // miniClickerUsersData ← название "ячейки" в памяти. Преобразует JavaScript-значение  в строку в формате JSON.
      setUsersData(data); // Обновляем базу с помощью специальной функции в которую положили данные в виде строки
    } catch (e) {
      console.error('Ошибка fallback-сохранения:', e);
    }
  }, [user, gameState]); // внимание. от чего зависит useCallback то и написали. Массив переменных, от которых зависит эта функция. Если они изменятся — функция пересоздаётся




  // Получить статистику игрока
  const getUserStats = useCallback((userId: number): UserStats | null => {
    return usersData.users[userId.toString()] || null; // ключи в объектах JavaScript — всегда строки.
  }, [usersData.users]);




  // Обновление общей статистики игрока (не базы, а внутри кода).
  const updateUserStats = useCallback((telegramUser: TelegramUser, stats: GameState) => { // Принимаем id Telegram user и его общую статистику
    const now = new Date().toISOString(); // Текущая дата
    const userId = telegramUser.id.toString();  // работаем со строкой
    const existing = usersData.users[userId];// Старая статистика

    const updatedStats: UserStats = {
      // Берём данные из Telegram
      userId: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
// Мы это делаем потому что еще общую базу не обновляли
// Происходит обращение к базе и обращение к интерфесу с общей статистикой. Это две разные информации
      totalClicks: (existing?.totalClicks || 0) + stats.clicks, // Если игрок уже был, берём его totalClicks - количество кликов. Если нет - считаем 0 + прибавляем клики из текущей сессии
      totalBalance: Math.max(existing?.totalBalance || 0, stats.balance), // Рекорд монет
      clickPowerLevel: Math.max(existing?.clickPowerLevel || 0, stats.clickPowerLevel),
      autoClickerLevel: Math.max(existing?.autoClickerLevel || 0, stats.autoClickerLevel),
      gamesPlayed: (existing?.gamesPlayed || 0) + 1, // сколько раз игрок запускал игру - количество сессий
      lastActive: now,
      joinDate: existing?.joinDate || now, // когда впервые запустил
    };

    const newData: UsersData = {
      users: { ...usersData.users, [userId]: updatedStats }, // обращаемся к базе с пользователями вызываем для всех пользователей функцию обновления статистики в базе
      lastUpdated: now, // Дата обновления базы - сейчас
    };

    saveUsersData(newData); // Сохранение новой актуальной базы
  }, [usersData.users, saveUsersData]);


  // ========================
  // ЭФФЕКТЫ
  // ========================


/*
Если бы это было в теле компонента, оно запускалось бы на каждом рендере, вызывая бесконечные запросы.
Без изоляции могло бы запускаться заново при изменениях состояния, вызывая ошибки
*/



  
  // Эффект для загрузка данных при старте

  /*
  Мы создаём внутри эффекта асинхронную функцию load. 
  Почему не делаем сам callback эффекта асинхронным? 
  Потому что useEffect не принимает async-функцию напрямую (он ожидает функцию, которая ничего не возвращает или возвращает cleanup-функцию). 
   */

  /*
  При монтировании компонента (первом рендере) асинхронно загружает глобальную базу игроков (UsersData) 
  с сервера (через /api/users/stats) или из localStorage (fallback). 
  Обновляет состояние usersData через setUsersData
  */
  useEffect(() => {
    const load = async () => {
      const data = await loadUsersData(); // Загрузка всех игроков с сервера
      setUsersData(data); // Обновляем состояние статистики
    };
    load(); // Вызов созданной функции
  }, [loadUsersData]);









  // Инициализация Telegram WebApp
  // Выполняется при измении функции getUserStats
  useEffect(() => {
    if (typeof window === 'undefined') return; // Если на сервере - ничего

    const tg = (window as any).Telegram?.WebApp; // Получение объекта Telegram WebApp, который автоматически подгружается скриптом из layout.tsx
    // — опциональная цепочка, чтобы не было ошибки, если объект не существует.
    

    // Если приложение запущено не в Telegram, просто считаем, что Telegram готов, и продолжаем (для разработки)
    if (!tg) {
      setIsTelegramReady(true); 
      return;
    }

    tg.ready(); // Сообщение для Telegram, что наш Mini App готово к работе [ Это важно для корректного отображения ].


    /* 
    Telegram передаёт данные о текущем пользователе в initDataUnsafe.user
    Взятие этого объекта и приведение к TelegramUser
    */
    const tgUser = tg.initDataUnsafe?.user as TelegramUser | undefined;
    if (tgUser) {
      setUser(tgUser); // Изменяем состояние - помещаем в него информацию о пользователе


      // Проверка - Есть уже сохранённая статистика этого игрока в загруженной ранее базе usersData
      const stats = getUserStats(tgUser.id);

      // Если игрок уже играл раньше (есть статистика) — не показываем долго приветственный экран, а скрываем его через 3 секунды.
      if (stats) {
        setTimeout(() => setShowWelcome(false), 3000);
      }
    }
    // Изменение состояние о том, что инициализация Telegram завершена
    setIsTelegramReady(true);
  }, [getUserStats]);








  // Загрузка сохранённого прогресса из localStorage

  // Зависимость только от от isTelegramReady — эффект сработает, когда Telegram будет готов.
  // Работа с ссостоянием gameState
  useEffect(() => {
    if (!isTelegramReady) return;

    const saved = localStorage.getItem('miniClickerState'); // Попытка взять сохранённое состояние игры из локального хранилища браузера.
    
    //Если данные есть → парсим 
    if (saved) { 
      try {
        const parsed = JSON.parse(saved) as Partial<GameState>; // Это может быть не полный объект, а только часть полей.
        // Синхронизация автокликера с уровнем (на случай старых сохранений)
        if (parsed.autoClickerLevel && parsed.autoClicker !== parsed.autoClickerLevel) {
          parsed.autoClicker = parsed.autoClickerLevel;
        }

        /* 
        Обновляем текущее игровое состояние, перезаписывая только те поля, которые были сохранены
        prev — текущее состояние
        ...parsed — данные из localStorage
        */

        setGameState(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Ошибка чтения сохранения');
      }
    
    }
  }, [isTelegramReady]);




  // Автосохранение в localStorage
  // Каждый раз, когда будет меняться игровое состояние текущей сессии gameState, то 
  // Происходит сохранение информации в localStorage как JSON-строку.
  useEffect(() => {
    localStorage.setItem('miniClickerState', JSON.stringify(gameState));
  }, [gameState]);






  // Реализация пассивного дохода каждую секунду
  useEffect(() => {
    if (gameState.autoClickerLevel <= 0 || gameState.autoClicker <= 0) return;


    // Каждую секунду выполняем функцию
    const interval = setInterval(() => {
      // Измянем игровое состояние - меняем текущий баланс + сила автокликера
      setGameState(prev => ({
        ...prev,
        balance: prev.balance + prev.autoClicker,
      }));
    }, 1000);

    /* Сleanup-функция эффекта. 
    Когда уровень автокликера изменится или компонент размонтируется, то
    Старый интервал очищается, чтобы не было утечек памяти и дублирования.
    */
    return () => clearInterval(interval);

    // Зависимости только от значений, влияющих на доход.
  }, [gameState.autoClicker, gameState.autoClickerLevel]);








// внтр код
  // классический приём debounce — мы не шлём данные на сервер при каждом клике, а ждём 3 секунды затишья, и только тогда сохраняем.
  // Экономим запросы к серверу, но сохраняем актуальную глобальную статистику.
  useEffect(() => {

    // Если пользователь не загружен - выход.
    if (!user) return;


    // Через 3 секунды после последнего изменения любого из перечисленных значений вызываем 
    const timeout = setTimeout(() => {
      updateUserStats(user, gameState); // Изменение состояния, которое хранит информацию пользователь в состоянии. Даём пользователя и текущую сессию
    }, 3000);

    return () => clearTimeout(timeout);
  }, [
    user,
    gameState.balance,
    gameState.clicks,
    gameState.clickPower,
    gameState.clickPowerLevel,
    gameState.autoClicker,
    gameState.autoClickerLevel,
    updateUserStats,
  ]);





  // ========================
  // ЛОГИКА ИГРЫ
  // ========================

  /* Функции, возвращающие стоимость следующего уровня:
  10 × 1.5^{уровень}
  */
  const getClickPowerCost = () => Math.floor(10 * Math.pow(1.5, gameState.clickPowerLevel));
  const getAutoClickerCost = () => Math.floor(50 * Math.pow(2, gameState.autoClickerLevel));


  /* 
  Реализация!

  Активный доход - от ручных кликов по кнопке "НАЖМИ!".

  При клике на большую кнопку:
  1. Добавляем монеты согласно текущей силе клика
  2. Увеличиваем счётчик кликов в текущей сессии.
  3. Запускаем короткую анимацию нажатия 

  */
  const handleClick = () => {
    setGameState(prev => ({
      ...prev,
      balance: prev.balance + prev.clickPower,
      clicks: prev.clicks + 1,
    }));
    setIsButtonAnimating(true);
    setTimeout(() => setIsButtonAnimating(false), 100); 
  };






  const upgradeClickPower = () => {
    const cost = getClickPowerCost(); // Стоимость следующего уровня
    if (gameState.balance < cost) return; // Нет денег - пока.

    // Если есть - тратим деньги, уровень увеличиваем
    setGameState(prev => ({
      ...prev,
      balance: prev.balance - cost,
      clickPowerLevel: prev.clickPowerLevel + 1,
      clickPower: prev.clickPower + 1,
    }));
  };


  
  const buyAutoClicker = () => { // Тоже самое для автокликера
    const cost = getAutoClickerCost();
    if (gameState.balance < cost) return;

    setGameState(prev => ({
      ...prev,
      balance: prev.balance - cost,
      autoClickerLevel: prev.autoClickerLevel + 1,
      autoClicker: prev.autoClickerLevel + 1, // +1 к доходу в секунду
    }));
  };













  // ========================
  // РЕНДЕР
  // ========================

  if (showWelcome && user) {
    return (
      <WelcomeOverlay>
        <WelcomeText>Привет, {user.username || user.first_name}!</WelcomeText>
        <WelcomeSubtitle>
          Добро пожаловать в Mini Clicker!<br />
          Нажми на кнопку, чтобы начать играть
        </WelcomeSubtitle>
        <StartButton onClick={() => setShowWelcome(false)}>
          Начать игру
        </StartButton>
      </WelcomeOverlay>
    );
  }

  return (
    <Container className="telegram-web-app scroll-container">
      {/* Информация о пользователе */}
      {user && (
        <UserInfo>
          <UserName>
            {user.first_name} {user.last_name || ''}{' '}
            {user.username && `(@${user.username})`}
          </UserName>
          <UserId>ID: {user.id}</UserId>
          {(() => {
            const stats = getUserStats(user.id);
            return stats ? (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                <div>Игр сыграно: {stats.gamesPlayed}</div>
                <div>Рекорд баланса: {stats.totalBalance.toLocaleString()}</div>
                <div>Всего кликов: {stats.totalClicks.toLocaleString()}</div>
              </div>
            ) : null;
          })()}
        </UserInfo>
      )}

      {/* Статистика */}
      <Header>
        <Card>
          <CardTitle>Баланс</CardTitle>
          <CardValue>{gameState.balance.toLocaleString()}</CardValue>
        </Card>
        <Card>
          <CardTitle>Клики</CardTitle>
          <CardValue>{gameState.clicks.toLocaleString()}</CardValue>
        </Card>
      </Header>

      {/* Кнопка клика  - Игрок нажал на кнопку*/}
      <MainButtonContainer>
        <ClickButton
          onClick={handleClick}
          $isAnimating={isButtonAnimating}
        >
          <ButtonText>НАЖМИ!</ButtonText>
        </ClickButton>
      </MainButtonContainer>

      {/* Улучшения */}
      <Upgrades>
        <UpgradeCard>
          <UpgradeTitle>Сила клика</UpgradeTitle>
          <UpgradeInfo>
            <span>Уровень: {gameState.clickPowerLevel}</span>
            <span>Сила: {gameState.clickPower}</span>
          </UpgradeInfo>
          <UpgradeInfo>
            <span>Стоимость: {getClickPowerCost().toLocaleString()}</span>
          </UpgradeInfo>
          <UpgradeButton
            onClick={upgradeClickPower}
            disabled={gameState.balance < getClickPowerCost()}
          >
            Улучшить
          </UpgradeButton>
        </UpgradeCard>

        <UpgradeCard>
          <UpgradeTitle>Автокликер</UpgradeTitle>
          <UpgradeInfo>
            <span>Уровень: {gameState.autoClickerLevel}</span>
            <span>Доход/сек: {gameState.autoClicker}</span>
          </UpgradeInfo>
          <UpgradeInfo>
            <span>Стоимость: {getAutoClickerCost().toLocaleString()}</span>
          </UpgradeInfo>
          <UpgradeButton
            onClick={buyAutoClicker}
            disabled={gameState.balance < getAutoClickerCost()}
          >
            Купить
          </UpgradeButton>
        </UpgradeCard>
      </Upgrades>
    </Container>
  );
}