/* 
Что делает данный файл?

1. Часть системы стилизации
2. Обеспечивает правильную работу styled - components в Next.js App Router особенно  при серверном рендеринге

*/

'use client';
import React from 'react';


interface Props {
  children: React.ReactNode;
}

// Этот компонент нужен для корректной работы styled-components в Next.js App Router
export default function StyledComponentsRegistry({ children }: Props) {

// Проверка на сервер/клиент нужна для расширяемости.

  if (typeof window === 'undefined') return <>{children}</>;

  // На клиенте также рендерим детей
  return <>{children}</>;
}


  /* Если сервер — просто возвращаем детей
  window — объект браузера, доступный только на клиенте.
  На сервере window не существует, поэтому typeof window вернёт "undefined".
*/
