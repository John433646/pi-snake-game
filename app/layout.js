import './globals.css';

export const metadata = {
  title: '贪吃蛇 · Next.js',
  description: '使用 Next.js 编写的经典贪吃蛇游戏',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
