import SnakeGame from '@/components/SnakeGame';

export default function Home() {
  return (
    <main className="page">
      <h1 className="title">贪吃蛇</h1>
      <p className="subtitle">方向键 / WASD 移动 · 空格 暂停 · R 重新开始</p>
      <SnakeGame />
    </main>
  );
}
