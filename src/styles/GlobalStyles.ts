// Определение базовых стилей для всего приложения


import { createGlobalStyle } from "styled-components";

const GlobalStyles = createGlobalStyle // React-компонент, который при рендеринге применит все стили, написанные внутри шаблонной строки

`
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}



body {
    font-family: 'Inter', 'Arial', sans-serif;
    background-color: #e4cd00ff;
    color: #000000;
    height: 100vh;
    overflow: hidden;
    padding: 20px;
    -webkit-font-smoothing: antialiased;
}



html, body, #__next {
    height: 100%; // Растяжение  html, body и корневой div Next.js на всю высоту
}

a {
    color: inherit;
    text-decoration: none;
    }




button {
    font-family: inherit; // Кнопки наследуют шрифт от body, а не используют системный
    cursor: pointer;
}
`;

export default GlobalStyles;
