/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pokemon: {
          bg: '#1a1a1a', // 어두운 배경 (게임보이 스타일)
          bgAlt: '#2d2d2d', // 대체 어두운 배경
          card: '#2d2d2d', // 어두운 카드 배경
          cardAlt: '#3a3a3a', // 대체 카드 배경
          text: '#ffffff', // 밝은 텍스트
          textAlt: '#90ee90', // 밝은 녹색 텍스트 (게임보이 스타일)
          red: '#ff0000', // 포켓몬스터 빨강
          blue: '#0066cc', // 포켓몬스터 파랑
          yellow: '#ffd700', // 포켓몬스터 노랑
          border: '#ffffff', // 밝은 보더
          borderAlt: '#90ee90', // 밝은 녹색 보더
          hover: '#3a3a3a', // 호버 배경
          selected: '#0066cc', // 선택된 항목 배경
          selectedText: '#ffffff', // 선택된 항목 텍스트
        },
      },
    },
  },
  plugins: [],
}

