// app/api/users/stats/route.ts


// Использование хранилища - Vercel KV (облачный Redis).

// kv — это очень быстрая база данных, где данные хранятся по ключу.

import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

// Ключ в KV | Один ключ — вся база игроков
const USERS_KEY = 'miniClickerUsersData';

// Важно: отключаем любые попытки кэшировать этот эндпоинт на уровне Next.js
// чтобы рейтинг и статистика всегда брались из актуального KV-хранилища, так как Next.js по умолчанию может кэшировать API.
export const dynamic = 'force-dynamic';


// Абсолютно совпадает с клиентом
interface UserStats {
  userId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  totalClicks: number;
  totalBalance: number;
  clickPowerLevel: number;
  autoClickerLevel: number;
  gamesPlayed: number;
  lastActive: string;
  joinDate: string;
}

interface UsersData {
  users: Record<string, UserStats>; // ключ — string (userId как строка)
  lastUpdated: string;
}

export async function GET() {
  try {
    let data = await kv.get<UsersData>(USERS_KEY);

    // Инициализация базы | Добавляем
    if (!data || !data.users) {
      data = { users: {}, lastUpdated: new Date().toISOString() };
      await kv.set(USERS_KEY, data);
    }
    // values(obj) - Превращение в массив | sort() работает только с массивами
    // Сортируем всех игроков по totalBalance (убывание) — теперь возвращаем ВСЕХ, а не только топ-10
    const allPlayers = Object.values(data.users).sort((a, b) => b.totalBalance - a.totalBalance);

    // Возвращаем полный объект, чтобы клиент мог использовать напрямую 
    // Но для совместимости сохраняем старый формат
    const response = NextResponse.json({
      data: {
        topPlayers: allPlayers,         // теперь все игроки в порядке рейтинга
        lastUpdated: data.lastUpdated,
      },
    });

    // Отключаем кэширование — важный фикс для немедленного отображения обновлений
    response.headers.set('Cache-Control', 'no-store, max-age=0');

    return response;
  } catch (error) {
    console.error('KV GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json(); // Тело запроса
    const { username, firstName, lastName, gameStats } = body ?? {}; // Деструктуризация

    // Дополнительная защита от некорректного тела запроса / существует и является объектом.
    const safeGameStats =
      gameStats && typeof gameStats === 'object'
        ? gameStats
        : {};

// Получаем заголовок запроса x-telegram-user-id. В нём клиент (Telegram бот) передаёт уникальный ID пользователя.
    const userIdHeader = request.headers.get('x-telegram-user-id');
    
    // Проверяем что есть
    if (!userIdHeader || isNaN(Number(userIdHeader))) {
      return NextResponse.json({ error: 'Invalid or missing user ID' }, { status: 400 });
    }
    const userIdStr = userIdHeader; // уже строка
    const userId = Number(userIdStr);


    // Извлекаем всю базу игроков из Vercel KV по ключу USERS_KEY.
    // Если данных ещё нет (null) или объект users отсутствует — создаём пустую базу:
    let data = await kv.get<UsersData>(USERS_KEY);


    
    if (!data || !data.users) {
      data = { users: {}, lastUpdated: new Date().toISOString() };
    }


    /*
    Проверяем, есть ли уже игрок с этим userIdStr в базе.

Если есть — используем существующие данные.

Если нет — создаём нового пользователя с начальными значениями:
    */
    const existing = data.users[userIdStr] || {
      userId,
      username,
      firstName,
      lastName,
      totalClicks: 0,
      totalBalance: 0,
      clickPowerLevel: 0,
      autoClickerLevel: 0,
      gamesPlayed: 0,
      lastActive: new Date().toISOString(),
      joinDate: new Date().toISOString(),
    };

    const clicksDelta = Number((safeGameStats as any).clicks) || 0;
    const balance = Number((safeGameStats as any).balance) || 0;
    const clickPowerLevel = Number((safeGameStats as any).clickPowerLevel) || 0;
    const autoClickerLevel = Number((safeGameStats as any).autoClickerLevel) || 0;

    const updatedStats: UserStats = {
      ...existing,
      username: username ?? existing.username,
      firstName: firstName ?? existing.firstName,
      lastName: lastName ?? existing.lastName,
      totalClicks: existing.totalClicks + clicksDelta,
      totalBalance: Math.max(existing.totalBalance, balance),
      clickPowerLevel: Math.max(existing.clickPowerLevel, clickPowerLevel),
      autoClickerLevel: Math.max(existing.autoClickerLevel, autoClickerLevel),
      gamesPlayed: existing.gamesPlayed + 1,
      lastActive: new Date().toISOString(),
      // joinDate остаётся прежней
    };

    data.users[userIdStr] = updatedStats;
    data.lastUpdated = new Date().toISOString();


    // Сохраняем всю базу игроков обратно в Vercel KV. Это асинхронная операция: данные теперь будут доступны при следующем GET-запросе.
    await kv.set(USERS_KEY, data);

    // Возвращаем клиенту JSON: { success: true }, чтобы сообщить, что данные успешно сохранены.
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('KV POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}