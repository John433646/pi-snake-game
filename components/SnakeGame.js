'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const COLS = 20;
const ROWS = 20;
const BASE_INTERVAL = 170; // 每步毫秒数（初始速度）
const MIN_INTERVAL = 70; // 最快速度
const SPEED_STEP = 4; // 每吃一个食物加快的毫秒数

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

const KEY_MAP = {
  arrowup: 'up',
  w: 'up',
  arrowdown: 'down',
  s: 'down',
  arrowleft: 'left',
  a: 'left',
  arrowright: 'right',
  d: 'right',
};

function randomFood(snake) {
  const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
  const free = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(Math.random() * free.length)];
}

function initialSnake() {
  const cy = Math.floor(ROWS / 2);
  const cx = Math.floor(COLS / 2);
  return [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export default function SnakeGame() {
  const [status, setStatus] = useState('idle'); // idle | running | paused | over | won
  const [score, setScore] = useState(0);
  const [high, setHigh] = useState(0);
  const [size, setSize] = useState(480);

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  const statusRef = useRef('idle');
  const snakeRef = useRef(initialSnake());
  const dirRef = useRef('right');
  const queueRef = useRef([]);
  const foodRef = useRef(null);
  const scoreRef = useRef(0);
  const sizeRef = useRef(480);

  const setStatusBoth = useCallback((s) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  // 读取历史最高分
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem('snake-high-score') || 0);
      if (Number.isFinite(saved) && saved > 0) setHigh(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const saveHigh = useCallback((value) => {
    setHigh((prev) => {
      if (value <= prev) return prev;
      try {
        localStorage.setItem('snake-high-score', String(value));
      } catch {
        /* ignore */
      }
      return value;
    });
  }, []);

  const reset = useCallback(() => {
    const snake = initialSnake();
    snakeRef.current = snake;
    dirRef.current = 'right';
    queueRef.current = [];
    scoreRef.current = 0;
    foodRef.current = randomFood(snake);
    setScore(0);
  }, []);

  const start = useCallback(() => {
    reset();
    setStatusBoth('running');
  }, [reset, setStatusBoth]);

  const gameOver = useCallback(() => {
    saveHigh(scoreRef.current);
    setStatusBoth('over');
  }, [saveHigh, setStatusBoth]);

  const step = useCallback(() => {
    const snake = snakeRef.current;
    const nextDir = queueRef.current.shift() || dirRef.current;
    dirRef.current = nextDir;
    const v = DIRS[nextDir];
    const head = snake[0];
    const next = { x: head.x + v.x, y: head.y + v.y };

    // 撞墙
    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      gameOver();
      return;
    }

    const food = foodRef.current;
    const willGrow = food && next.x === food.x && next.y === food.y;
    // 不吃食物时尾巴会移开，因此尾格不算碰撞
    const body = willGrow ? snake : snake.slice(0, -1);
    if (body.some((s) => s.x === next.x && s.y === next.y)) {
      gameOver();
      return;
    }

    const newSnake = [next, ...(willGrow ? snake : snake.slice(0, -1))];
    snakeRef.current = newSnake;

    if (willGrow) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      saveHigh(scoreRef.current);
      const newFood = randomFood(newSnake);
      foodRef.current = newFood;
      if (!newFood) {
        saveHigh(scoreRef.current);
        setStatusBoth('won');
      }
    }
  }, [gameOver, saveHigh, setStatusBoth]);

  // 绘制
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cssSize = sizeRef.current;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssSize, cssSize);

    const cell = cssSize / COLS;

    // 棋盘格
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.fillStyle =
          (x + y) % 2 === 0 ? 'rgba(255,255,255,0.022)' : 'rgba(255,255,255,0.005)';
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }

    // 食物
    const food = foodRef.current;
    if (food) {
      const cx = food.x * cell + cell / 2;
      const cy = food.y * cell + cell / 2;
      const r = cell * 0.32;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, cell * 0.9);
      glow.addColorStop(0, 'rgba(248,113,113,0.55)');
      glow.addColorStop(1, 'rgba(248,113,113,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.9, 0, Math.PI * 2);
      ctx.fill();

      const g = ctx.createRadialGradient(
        cx - r * 0.4,
        cy - r * 0.4,
        r * 0.1,
        cx,
        cy,
        r,
      );
      g.addColorStop(0, '#fecaca');
      g.addColorStop(1, '#ef4444');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 蛇
    const snake = snakeRef.current;
    const len = snake.length;
    snake.forEach((seg, i) => {
      const t = len <= 1 ? 0 : i / (len - 1);
      const x = seg.x * cell + cell * 0.06;
      const y = seg.y * cell + cell * 0.06;
      const w = cell * 0.88;

      if (i === 0) {
        ctx.fillStyle = '#86efac';
      } else {
        const cr = Math.round(74 + (34 - 74) * t);
        const cg = Math.round(222 + (211 - 222) * t);
        const cb = Math.round(128 + (238 - 128) * t);
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      }
      roundRect(ctx, x, y, w, w, cell * 0.28);
      ctx.fill();
    });

    // 蛇眼睛
    if (len > 0) {
      const head = snake[0];
      const v = DIRS[dirRef.current];
      const cx = head.x * cell + cell / 2;
      const cy = head.y * cell + cell / 2;
      const off = cell * 0.18;
      const dx = v.y !== 0 ? off : 0;
      const dy = v.x !== 0 ? off : 0;
      const fx = v.x * cell * 0.16;
      const fy = v.y * cell * 0.16;
      const r = Math.max(1.2, cell * 0.075);
      ctx.fillStyle = '#0b1020';
      ctx.beginPath();
      ctx.arc(cx + dx + fx, cy + dy + fy, r, 0, Math.PI * 2);
      ctx.arc(cx - dx + fx, cy - dy + fy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  // 主循环
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(now - last, 250);
      last = now;

      if (statusRef.current === 'running') {
        const interval = Math.max(
          MIN_INTERVAL,
          BASE_INTERVAL - scoreRef.current * SPEED_STEP,
        );
        acc += dt;
        while (acc >= interval) {
          acc -= interval;
          step();
          if (statusRef.current !== 'running') {
            acc = 0;
            break;
          }
        }
      } else {
        acc = 0;
      }

      draw();
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, draw]);

  // 自适应画布尺寸
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) setSize(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 根据尺寸设置 canvas 像素缓冲
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    draw();
  }, [size, draw]);

  // 初始食物
  useEffect(() => {
    if (!foodRef.current) foodRef.current = randomFood(snakeRef.current);
  }, []);

  const changeDir = useCallback(
    (name) => {
      if (statusRef.current === 'idle') start();
      if (statusRef.current !== 'running') return;
      const q = queueRef.current;
      const lastDir = q.length ? q[q.length - 1] : dirRef.current;
      if (name === lastDir || name === OPPOSITE[lastDir]) return;
      if (q.length < 2) q.push(name);
    },
    [start],
  );

  const togglePause = useCallback(() => {
    if (statusRef.current === 'running') setStatusBoth('paused');
    else if (statusRef.current === 'paused') setStatusBoth('running');
    else if (statusRef.current === 'idle' || statusRef.current === 'over' || statusRef.current === 'won')
      start();
  }, [setStatusBoth, start]);

  // 键盘控制
  useEffect(() => {
    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (KEY_MAP[key]) {
        e.preventDefault();
        changeDir(KEY_MAP[key]);
        return;
      }
      if (key === ' ' || key === 'spacebar') {
        e.preventDefault();
        togglePause();
      } else if (key === 'r') {
        e.preventDefault();
        start();
      } else if (key === 'enter') {
        if (statusRef.current !== 'running') start();
      }
    };
    window.addEventListener('keydown', onKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [changeDir, togglePause, start]);

  // 切换标签页时自动暂停
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && statusRef.current === 'running') {
        setStatusBoth('paused');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [setStatusBoth]);

  const interval = Math.max(MIN_INTERVAL, BASE_INTERVAL - score * SPEED_STEP);
  const speedLevel = Math.max(1, Math.round((BASE_INTERVAL - interval) / SPEED_STEP) + 1);

  return (
    <div className="game">
      <div className="hud">
        <div className="stat">
          <span>得分</span>
          <strong>{score}</strong>
        </div>
        <div className="stat">
          <span>最高分</span>
          <strong>{high}</strong>
        </div>
        <div className="stat">
          <span>速度</span>
          <strong>{speedLevel}</strong>
        </div>
      </div>

      <div className="board-wrap">
        <div ref={wrapRef} style={{ width: '100%' }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: 'auto', aspectRatio: '1 / 1' }}
            aria-label="贪吃蛇游戏区域"
          />
        </div>

        {status !== 'running' && (
          <div className="overlay">
            {status === 'idle' && (
              <>
                <h2>准备开始</h2>
                <p>吃到红色食物让蛇变长，别撞墙也别咬到自己。</p>
                <div className="actions">
                  <button className="primary" onClick={start}>
                    开始游戏
                  </button>
                </div>
              </>
            )}
            {status === 'paused' && (
              <>
                <h2>已暂停</h2>
                <p>按空格或点击按钮继续</p>
                <div className="actions">
                  <button className="primary" onClick={togglePause}>
                    继续
                  </button>
                  <button onClick={start}>重新开始</button>
                </div>
              </>
            )}
            {status === 'over' && (
              <>
                <h2>游戏结束</h2>
                <p>
                  本局得分 <strong>{score}</strong>
                  {score >= high && score > 0 ? ' · 新纪录！' : ''}
                </p>
                <div className="actions">
                  <button className="primary" onClick={start}>
                    再来一局
                  </button>
                </div>
              </>
            )}
            {status === 'won' && (
              <>
                <h2>🎉 通关了！</h2>
                <p>你填满了整个棋盘，得分 {score}</p>
                <div className="actions">
                  <button className="primary" onClick={start}>
                    再玩一次
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="dpad">
        <button className="up" onClick={() => changeDir('up')} aria-label="上">
          ↑
        </button>
        <button className="left" onClick={() => changeDir('left')} aria-label="左">
          ←
        </button>
        <button className="down" onClick={() => changeDir('down')} aria-label="下">
          ↓
        </button>
        <button className="right" onClick={() => changeDir('right')} aria-label="右">
          →
        </button>
      </div>

      <div className="actions">
        <button className="primary" onClick={togglePause}>
          {status === 'running' ? '暂停' : status === 'paused' ? '继续' : '开始'}
        </button>
        <button onClick={start}>重新开始</button>
      </div>

      <p className="hint">
        方向键 / WASD 移动 · 空格 暂停或继续 · R 重新开始 · 最高分会保存在本地
      </p>
    </div>
  );
}
