/*
Главная страница
*/

'use client'; // мы используем useState, useEffect и работаем с объектом window (Telegram WebApp API), которые доступны только в браузере.

import GameContainer from '@/components/GameContainer';
import { useEffect, useState } from 'react';

// useState — для хранения состояния (готов ли Telegram?)
// useEffect — чтобы выполнить код один раз при загрузке страницы


export default function Home() {
  const [isTelegramReady, setIsTelegramReady] = useState(false); // Инициализация состояния, которое показывает инициализирован ли Telegram WebApp.

  useEffect(() => {
    // Проверка, что код выполняется в браузере (на сервере window не существует)
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) { // Приведене типов. TypeScript не знает про Telegram API. По умолчанию TypeScript знает только стандартные свойства объекта window: 
      const tg = (window as any).Telegram.WebApp;
      tg.ready(); // Инициализация Telegram — сообщает Telegram, что приложение готово к работе. Это необходимо для корректного отображения интерфейса.
      tg.expand(); // Расширение приложения — разворачивает мини-приложение на весь экран внутри Telegram.
      setIsTelegramReady(true); // Скрытие экрана загрузки и отрендерит игровой компонент.
    } else { // Обработка случая вне Telegram — выполняется, если приложение запущено не в Telegram (например, в браузере при локальной разработке).
      setIsTelegramReady(true); // чтобы игра работала и вне Telegram (для разработки).
    }
  }, []);

  // Экран загрузки, пока Telegram WebApp не готов
  if (!isTelegramReady) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center', // Управление выравниванием элементов вдоль главной оси (Горизонтальной) flex-контейнера.
          alignItems: 'center', // Управление выравниванием элементов вдоль поперечной оси flex-контейнера.
          height: '100vh',
          backgroundColor: '#ffeb3b',
          color: '#000',
          fontSize: '18px',
          fontWeight: 'bold',
        }}
      >
        Загрузка Telegram Mini App...
      </div>
    );
  }

  return <GameContainer />;
}