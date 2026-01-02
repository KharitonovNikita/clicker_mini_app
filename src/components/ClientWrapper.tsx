/* Компонент, который оборачивает приложение, применяя глобальные стили и настройки styled-components


Для чего это нужно?

1. Решение проблемы SSR (Server-Side Rendering) c styled-components.

B Next js есть проблема: styled-components не работает корректно с серверным рендерингом "из коробки". 
Компонент ClientWrapper с директивой 'use client решает эту проблему:

 - Cервер: Next.js рендерит HTML без стилей;
- Клиент: ClientWrapper обеспечивает правильную гидратацию стилей.


2. Централизованное управление глобальными стилями.

ClientWrapper подключает GlobalStyles из styled-components


ClientWrapper - это необходимый мост между Next.js SSR и styled-components, который обеспечивает:

- корректную работу стилей на сервере и клиенте,
- централизованное управление глобальными стилями;
- совместимость с Telegram Web App;
- Чистую архитектуру приложения.


Оборачивает содержимое StyledComponentsRegistry и доавляет GlobalStyles


*/


'use client';

import GlobalStyles from '@/styles/GlobalStyles';
import { ReactNode } from 'react';
import StyledComponentsRegistry from './StyledComponentsRegistry';

interface ClientWrapperProps {
  children: ReactNode;
}

export default function ClientWrapper({ children }: ClientWrapperProps) {
  return (
    // Подключаем реестр стилей
    <StyledComponentsRegistry>  
      {/* Применяя глобальные стили */}
      <GlobalStyles />
         {/* Рендерим остальное приложение */}
      {children} 
    </StyledComponentsRegistry>
  );
}