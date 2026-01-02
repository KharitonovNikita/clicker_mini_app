/*
Фундамент Next.js приложения, который:

- Создаёт базовую HTML - структуру
- Настраивает глобальные метаданные и скрипты
- Обеспечивает интеграцию с Telegram Web App
- Применяет общие стили и шрифты
- Объединяет все страницы в единое приложение


Без layout каждая страниц была бы изолированной и нам пришлось бы дублировать много кода!
*/


import ClientWrapper from '@/components/ClientWrapper';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Позволяет автоматически загружать и оптимизировать Google Fonts.
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Mini Clicker - Игра-кликер',
  description: 'Простая игра-кликер для Telegram с минималистичным дизайном',
  manifest: '/manifest.json'
};

export default function RootLayout({
  children, // Получение пропса children - все страницы приложения
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <script
          src="https://telegram.org/js/telegram-web-app.js" // Telegram загружает твою страницу и добавляет скрипт
          async
        />
      </head>
      <body className={inter.className}> { /*Сюда попадает всё содержимое приложения / Применяемрифт Inter ко всему body */}
        <ClientWrapper>{children}</ClientWrapper> { /* Оборачиваем все странциы(children в наш ClientWrapper ) */}
      </body>
    </html>
  );
}


export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffeb3b',
};