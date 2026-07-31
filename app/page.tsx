"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

const passes = [
  {
    id: "desk",
    number: "01",
    name: "Вечерний стол",
    time: "19:00—00:00",
    price: "1 900 ₽",
    note: "Одна плотная рабочая сессия без отвлечений.",
    includes: ["Рабочее место", "Кофе и снеки", "Переговорная 30 мин"],
  },
  {
    id: "night",
    number: "02",
    name: "Полная ночь",
    time: "20:00—08:00",
    price: "3 400 ₽",
    note: "Когда проект нужно закончить до начала нового дня.",
    includes: ["Любое свободное место", "Тихая комната 1 час", "Душ и кухня"],
    featured: true,
  },
  {
    id: "resident",
    number: "03",
    name: "Резидент",
    time: "30 дней / 24·7",
    price: "17 900 ₽",
    note: "Своё рабочее место в городе после заката.",
    includes: ["Безлимитный доступ", "Личный шкафчик", "4 часа переговорной"],
  },
];

const features = [
  {
    number: "01",
    tag: "QUIET FLOOR",
    title: "Зона абсолютной тишины",
    text: "Без звонков и встреч. Только клавиатуры, бумага и работа.",
  },
  {
    number: "02",
    tag: "PRIVATE ROOM",
    title: "Две комнаты для созвонов",
    text: "Изолированные кабины с камерой, светом и правильной акустикой.",
  },
  {
    number: "03",
    tag: "NIGHT KITCHEN",
    title: "Кофе, еда и душ",
    text: "Всё, чтобы не прерывать поток и не искать круглосуточный магазин.",
  },
  {
    number: "04",
    tag: "HARDWARE",
    title: "4K-мониторы и Wi-Fi 6",
    text: "USB-C док-станции и проводное подключение на каждом столе.",
  },
];

const steps = [
  ["01", "Оставь заявку", "Выбери смену и дату первого визита."],
  ["02", "Получи код", "Подтвердим место и отправим доступ в Telegram."],
  ["03", "Приходи ночью", "Занимай стол и оставайся до конца смены."],
];

type PhysicsBody = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  width: number;
  height: number;
  dragging: boolean;
};

type ActiveDrag = {
  index: number;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  lastX: number;
  lastY: number;
  lastTime: number;
};

function PhysicsLetters() {
  const containerRef = useRef<HTMLElement | null>(null);
  const bodiesRef = useRef<PhysicsBody[]>([]);
  const activeDrag = useRef<ActiveDrag | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nodes = Array.from(
      container.querySelectorAll<HTMLElement>(".physics-letter"),
    );
    let frame = 0;
    let previousTime = performance.now();
    let bounds = container.getBoundingClientRect();
    let initialized = false;

    const measure = () => {
      const oldWidth = Math.max(bounds.width, 1);
      const oldHeight = Math.max(bounds.height, 1);
      bounds = container.getBoundingClientRect();

      if (!initialized) {
        bodiesRef.current = nodes.map((node, index) => {
          const nodeBounds = node.getBoundingClientRect();
          const width = nodeBounds.width;
          const height = nodeBounds.height;
          const columns = Math.max(3, Math.floor(bounds.width / Math.max(width * 0.82, 1)));
          const column = index % columns;
          const row = Math.floor(index / columns);

          return {
            x: Math.min(
              bounds.width - width - 8,
              26 + column * width * 0.76 + (row % 2) * width * 0.24,
            ),
            y: -height * (row + 1) - index * 18,
            vx: (index % 2 ? -1 : 1) * (0.7 + (index % 3) * 0.24),
            vy: 0,
            angle: -18 + ((index * 29) % 36),
            spin: (index % 2 ? 1 : -1) * (0.16 + (index % 4) * 0.08),
            width,
            height,
            dragging: false,
          };
        });
        initialized = true;
        return;
      }

      bodiesRef.current.forEach((body, index) => {
        body.x = (body.x / oldWidth) * bounds.width;
        body.y = (body.y / oldHeight) * bounds.height;
        body.width = nodes[index]?.getBoundingClientRect().width ?? body.width;
        body.height = nodes[index]?.getBoundingClientRect().height ?? body.height;
      });
    };

    const renderBodies = () => {
      bodiesRef.current.forEach((body, index) => {
        const node = nodes[index];
        if (!node) return;
        node.style.transform = `translate3d(${body.x}px, ${body.y}px, 0) rotate(${body.angle}deg)`;
      });
    };

    const resolveCollisions = () => {
      const bodies = bodiesRef.current;
      for (let first = 0; first < bodies.length; first += 1) {
        for (let second = first + 1; second < bodies.length; second += 1) {
          const a = bodies[first];
          const b = bodies[second];
          if (a.dragging && b.dragging) continue;

          const ax = a.x + a.width / 2;
          const ay = a.y + a.height / 2;
          const bx = b.x + b.width / 2;
          const by = b.y + b.height / 2;
          const dx = bx - ax;
          const dy = by - ay;
          const distance = Math.max(Math.hypot(dx, dy), 0.001);
          const minDistance =
            Math.min(a.width, a.height) * 0.43 +
            Math.min(b.width, b.height) * 0.43;

          if (distance >= minDistance) continue;
          const normalX = dx / distance;
          const normalY = dy / distance;
          const overlap = minDistance - distance;

          if (!a.dragging) {
            a.x -= normalX * overlap * (b.dragging ? 1 : 0.5);
            a.y -= normalY * overlap * (b.dragging ? 1 : 0.5);
          }
          if (!b.dragging) {
            b.x += normalX * overlap * (a.dragging ? 1 : 0.5);
            b.y += normalY * overlap * (a.dragging ? 1 : 0.5);
          }

          const relativeVelocity =
            (b.vx - a.vx) * normalX + (b.vy - a.vy) * normalY;
          if (relativeVelocity < 0) {
            const impulse = -relativeVelocity * 0.68;
            if (!a.dragging) {
              a.vx -= impulse * normalX;
              a.vy -= impulse * normalY;
              a.spin -= impulse * normalX * 0.025;
            }
            if (!b.dragging) {
              b.vx += impulse * normalX;
              b.vy += impulse * normalY;
              b.spin += impulse * normalX * 0.025;
            }
          }
        }
      }
    };

    const tick = (time: number) => {
      const delta = Math.min((time - previousTime) / 16.667, 2);
      previousTime = time;
      const width = bounds.width;
      const height = Math.max(180, bounds.height - 96);

      bodiesRef.current.forEach((body) => {
        if (body.dragging) return;
        body.vy += 0.46 * delta;
        body.vx *= 0.997;
        body.vy *= 0.998;
        body.spin *= 0.996;
        body.x += body.vx * delta;
        body.y += body.vy * delta;
        body.angle += body.spin * delta;

        if (body.x < 0) {
          body.x = 0;
          body.vx = Math.abs(body.vx) * 0.68;
          body.spin += body.vy * 0.015;
        } else if (body.x + body.width > width) {
          body.x = width - body.width;
          body.vx = -Math.abs(body.vx) * 0.68;
          body.spin -= body.vy * 0.015;
        }

        if (body.y < 0) {
          body.y = 0;
          body.vy = Math.abs(body.vy) * 0.52;
        } else if (body.y + body.height > height) {
          body.y = height - body.height;
          body.vy = -Math.abs(body.vy) * 0.48;
          body.vx *= 0.9;
          if (Math.abs(body.vy) < 0.45) body.vy = 0;
        }
      });

      resolveCollisions();
      renderBodies();
      frame = window.requestAnimationFrame(tick);
    };

    const getPoint = (event: PointerEvent) => ({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });

    const onPointerDown = (event: PointerEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        ".physics-letter",
      );
      if (!target) return;
      const index = Number(target.dataset.index);
      const body = bodiesRef.current[index];
      if (!body) return;
      event.preventDefault();
      const point = getPoint(event);
      body.dragging = true;
      body.vx = 0;
      body.vy = 0;
      target.classList.add("is-grabbed");
      activeDrag.current = {
        index,
        pointerId: event.pointerId,
        offsetX: point.x - body.x,
        offsetY: point.y - body.y,
        lastX: point.x,
        lastY: point.y,
        lastTime: performance.now(),
      };
      container.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      const active = activeDrag.current;
      if (!active || active.pointerId !== event.pointerId) return;
      const body = bodiesRef.current[active.index];
      if (!body) return;
      const point = getPoint(event);
      const now = performance.now();
      const elapsed = Math.max(now - active.lastTime, 4);
      body.vx = ((point.x - active.lastX) / elapsed) * 16.667;
      body.vy = ((point.y - active.lastY) / elapsed) * 16.667;
      body.x = Math.max(
        0,
        Math.min(bounds.width - body.width, point.x - active.offsetX),
      );
      body.y = Math.max(
        0,
        Math.min(bounds.height - body.height, point.y - active.offsetY),
      );
      body.angle += (point.x - active.lastX) * 0.12;
      active.lastX = point.x;
      active.lastY = point.y;
      active.lastTime = now;
    };

    const releasePointer = (event: PointerEvent) => {
      const active = activeDrag.current;
      if (!active || active.pointerId !== event.pointerId) return;
      const body = bodiesRef.current[active.index];
      const node = nodes[active.index];
      if (body) {
        body.dragging = false;
        body.spin += Math.max(-2.2, Math.min(2.2, body.vx * 0.08));
      }
      node?.classList.remove("is-grabbed");
      activeDrag.current = null;
      if (container.hasPointerCapture(event.pointerId)) {
        container.releasePointerCapture(event.pointerId);
      }
    };

    measure();
    document.fonts?.ready.then(measure).catch(() => undefined);
    window.addEventListener("resize", measure);
    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", releasePointer);
    container.addEventListener("pointercancel", releasePointer);
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", releasePointer);
      container.removeEventListener("pointercancel", releasePointer);
    };
  }, []);

  return (
    <figure className="physics-box" ref={containerRef}>
      <div className="physics-grid" aria-hidden="true" />
      <div className="physics-label">
        <span>INTERACTIVE TYPE / 01</span>
        <span>DRAG + THROW</span>
      </div>
      <div
        className="physics-letters"
        role="application"
        aria-label="Интерактивные буквы NIGHTSHIFT. Перетаскивайте и бросайте их."
      >
        {"NIGHTSHIFT".split("").map((letter, index) => (
          <span
            className="physics-letter"
            data-index={index}
            data-cursor="interactive"
            aria-hidden="true"
            key={`${letter}-${index}`}
            style={{ "--letter-index": index } as CSSProperties}
          >
            {letter}
          </span>
        ))}
      </div>
      <strong className="physics-year">20—26</strong>
      <figcaption>
        Буквы подчиняются гравитации.
        <br />
        Возьми любую и брось.
      </figcaption>
    </figure>
  );
}

function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor || !window.matchMedia("(pointer: fine)").matches) return;

    const move = (event: PointerEvent) => {
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      cursor.classList.add("is-visible");
    };
    const over = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      cursor.classList.toggle(
        "is-interactive",
        Boolean(
          target.closest(
            "a, button, input, select, [data-cursor='interactive']",
          ),
        ),
      );
    };
    const down = () => cursor.classList.add("is-down");
    const up = () => cursor.classList.remove("is-down");
    const leave = () => cursor.classList.remove("is-visible");

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.documentElement.removeEventListener("mouseleave", leave);
    };
  }, []);

  return <div className="cursor-dot" ref={cursorRef} aria-hidden="true" />;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [noiseOn, setNoiseOn] = useState(false);
  const [selectedPass, setSelectedPass] = useState("night");
  const [modalOpen, setModalOpen] = useState(false);
  const [booked, setBooked] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);
  const noiseSource = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    let direction: "down" | "up" = "down";
    let lastScroll = window.scrollY;
    let scrollFrame = 0;
    const revealItems = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const movingLines = Array.from(
      document.querySelectorAll<HTMLElement>("[data-scroll-line]"),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const item = entry.target as HTMLElement;
          item.dataset.flow = direction;
          item.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -7% 0px" },
    );
    revealItems.forEach((item) => observer.observe(item));

    const updateScroll = () => {
      const current = window.scrollY;
      direction = current >= lastScroll ? "down" : "up";
      document.documentElement.dataset.scrollDirection = direction;
      lastScroll = current;

      movingLines.forEach((line) => {
        const rect = line.getBoundingClientRect();
        const progress = Math.max(
          0,
          Math.min(
            1,
            (window.innerHeight - rect.top) /
              (window.innerHeight + rect.height),
          ),
        );
        const multiplier = line.dataset.scrollLine === "reverse" ? -1 : 1;
        line.style.setProperty(
          "--scroll-shift",
          `${(progress - 0.5) * 320 * multiplier}px`,
        );
      });
      scrollFrame = 0;
    };

    const onScroll = () => {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScroll);
    };

    updateScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
    };
  }, []);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  const stopNoise = useCallback(() => {
    noiseSource.current?.stop();
    noiseSource.current = null;
    audioContext.current?.close();
    audioContext.current = null;
    setNoiseOn(false);
  }, []);

  useEffect(() => stopNoise, [stopNoise]);

  const toggleNoise = () => {
    if (noiseOn) {
      stopNoise();
      return;
    }
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const buffer = context.createBuffer(
      1,
      context.sampleRate * 2,
      context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = "lowpass";
    filter.frequency.value = 720;
    gain.gain.value = 0.026;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
    audioContext.current = context;
    noiseSource.current = source;
    setNoiseOn(true);
  };

  const openBooking = (passId = selectedPass) => {
    setSelectedPass(passId);
    setBooked(false);
    setModalOpen(true);
  };

  const activePass =
    passes.find((passItem) => passItem.id === selectedPass) ?? passes[1];

  const submitBooking = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBooked(true);
  };

  return (
    <main className="site-shell">
      <CustomCursor />

      <header className="site-header">
        <a className="brand" href="#top" onClick={() => setMenuOpen(false)}>
          <span>N</span>
          NIGHTSHIFT
        </a>
        <p>PRIVATE NIGHT WORK CLUB</p>
        <nav className={menuOpen ? "nav is-open" : "nav"} aria-label="Навигация">
          <a href="#space" onClick={() => setMenuOpen(false)}>
            Пространство
          </a>
          <a href="#included" onClick={() => setMenuOpen(false)}>
            Возможности
          </a>
          <a href="#passes" onClick={() => setMenuOpen(false)}>
            Пропуска
          </a>
          <button type="button" onClick={() => openBooking()}>
            Бронь ↗
          </button>
        </nav>
        <button
          className="menu-button"
          type="button"
          aria-label="Открыть меню"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span />
          <span />
        </button>
      </header>

      <section className="hero-board" id="top">
        <div className="hero-side">
          <div className="hero-index">
            <span>01 / MOSCOW</span>
            <span>55.7580° N</span>
          </div>
          <div className="hero-copy">
            <p>НОЧНОЙ РАБОЧИЙ КЛУБ</p>
            <h1>
              ФОКУС
              <br />
              ПОСЛЕ
              <br />
              ЗАКАТА.
            </h1>
          </div>
          <div className="hero-arrow" aria-hidden="true">
            ↘
          </div>
          <div className="hero-tags">
            <span># Тишина</span>
            <span># 16_мест</span>
            <span># Курская</span>
            <span># До_утра</span>
            <span># 24_резидента</span>
          </div>
        </div>
        <PhysicsLetters />
      </section>

      <a className="see-more" href="#space">
        <span>ПРОКРУТИ, ЧТОБЫ ВОЙТИ В НОЧЬ</span>
        <b>↓</b>
      </a>

      <section className="section-shell" id="space">
        <div className="section-nav">
          <a className="brand mini" href="#top">
            <span>N</span>
            NIGHTSHIFT
          </a>
          <div>
            <a className="active" href="#space">
              О клубе
            </a>
            <a href="#included">Что внутри</a>
            <a href="#passes">Пропуска</a>
          </div>
          <button type="button" onClick={() => openBooking()}>
            Войти ночью ↗
          </button>
        </div>

        <div className="about-grid">
          <article className="story-card" data-reveal>
            <div className="story-photo" />
            <div className="story-shade" />
            <span>HELLO, NIGHT OWL.</span>
            <h2>
              КОГДА
              <br />
              ГОРОД
              <br />
              ЗАМОЛКАЕТ
            </h2>
            <p>
              Мы оставляем свет включённым для тех, кто делает лучшую работу
              после заката.
            </p>
          </article>

          <div className="about-content">
            <div className="about-heading" data-reveal>
              <span>INTRODUCTION</span>
              <i>↘</i>
            </div>
            <article className="intro-card" data-reveal>
              <div>
                <span>НЕ КОВОРКИНГ.</span>
                <h2>РАБОЧИЙ КЛУБ ДЛЯ НОЧНОЙ СМЕНЫ.</h2>
              </div>
              <p>
                NIGHTSHIFT — закрытое пространство для дизайнеров,
                разработчиков, архитекторов и основателей. Здесь не проводят
                мероприятия и не продают переговорные по минутам. Здесь
                работают.
              </p>
            </article>

            <div className="contact-heading" data-reveal>
              <span>LIVE STATUS</span>
              <i>↘</i>
            </div>
            <div className="status-grid">
              <article className="status-card black" data-reveal>
                <span>СВОБОДНО СЕГОДНЯ</span>
                <strong>08</strong>
                <small>из 16 мест</small>
              </article>
              <button
                className={noiseOn ? "status-card blue noise is-on" : "status-card blue noise"}
                type="button"
                onClick={toggleNoise}
                aria-pressed={noiseOn}
              >
                <span>ROOM TONE</span>
                <strong>{noiseOn ? "PAUSE" : "PLAY"}</strong>
                <div aria-hidden="true">
                  {Array.from({ length: 9 }).map((_, index) => (
                    <i key={index} />
                  ))}
                </div>
              </button>
              <button
                className="status-card light booking-card"
                type="button"
                onClick={() => openBooking()}
                data-reveal
              >
                <span>FIRST VISIT</span>
                <strong>ЗАБРОНИРОВАТЬ</strong>
                <b>↗</b>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="kinetic-type" aria-label="Ночная философия">
        <div data-scroll-line="forward">
          <span>ТИШИНА</span>
          <i>✦</i>
          <span>ФОКУС</span>
          <i>✦</i>
          <span>ПОСЛЕ 22:00</span>
        </div>
        <div data-scroll-line="reverse">
          <span>РАБОТАЙ</span>
          <i>↘</i>
          <span>ПОКА ГОРОД СПИТ</span>
          <i>↗</i>
        </div>
      </section>

      <section className="section-shell workspace-section" id="included">
        <div className="workspace-intro" data-reveal>
          <p>ВСЁ УЖЕ ВНУТРИ ПРОПУСКА</p>
          <h2>
            НОЧНАЯ
            <br />
            ИНФРАСТРУКТУРА
          </h2>
          <span>
            Принеси ноутбук и задачу.
            <br />
            Об остальном мы уже подумали.
          </span>
        </div>

        <div className="workspace-grid">
          <div className="feature-column">
            <div className="column-title">
              <span>EXPERIENCE</span>
              <i>↘</i>
            </div>
            {features.map((feature, index) => (
              <article
                className="feature-card"
                data-reveal
                key={feature.number}
                style={{ "--delay": `${index * 70}ms` } as CSSProperties}
              >
                <div>
                  <span>{feature.number}</span>
                  <b>{feature.tag}</b>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
                <i>↗</i>
              </article>
            ))}
          </div>

          <div className="space-column">
            <div className="column-title">
              <span>ATMOSPHERE</span>
              <i>↘</i>
            </div>
            <article className="expertise-card" data-reveal>
              <p>
                QUIET FLOOR · PRIVATE ROOMS · NIGHT KITCHEN · 4K DISPLAYS ·
                SHOWER · LOCKERS · FILTER COFFEE
              </p>
              <div className="room-photo" />
              <div className="pill-row">
                <span># Тишина</span>
                <span># Архитектура</span>
                <span># Ночь</span>
                <span># Фокус</span>
              </div>
            </article>
          </div>

          <div className="facts-column">
            <div className="column-title">
              <span>NUMBERS</span>
              <i>↘</i>
            </div>
            {[
              ["16", "РАБОЧИХ МЕСТ"],
              ["02", "ТИХИЕ КОМНАТЫ"],
              ["24", "РЕЗИДЕНТА МАКСИМУМ"],
              ["∞", "ФИЛЬТР-КОФЕ"],
            ].map(([number, label], index) => (
              <article
                className={index % 2 ? "fact-card white" : "fact-card black"}
                data-reveal
                key={label}
              >
                <span>{label}</span>
                <strong>{number}</strong>
                <i>●</i>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="passes-section" id="passes">
        <div className="passes-heading" data-reveal>
          <span>03 / ACCESS</span>
          <h2>
            ВЫБЕРИ
            <br />
            СВОЮ СМЕНУ.
          </h2>
          <p>
            Первый визит — без абонемента. Если ритм совпадёт, предложим
            резидентство.
          </p>
        </div>
        <div className="pass-grid">
          {passes.map((passItem, index) => (
            <article
              className={passItem.featured ? "pass-card featured" : "pass-card"}
              key={passItem.id}
              data-reveal
              style={{ "--delay": `${index * 90}ms` } as CSSProperties}
            >
              <div className="pass-top">
                <span>{passItem.number}</span>
                <span>{passItem.time}</span>
              </div>
              <h3>{passItem.name}</h3>
              <strong>{passItem.price}</strong>
              <p>{passItem.note}</p>
              <ul>
                {passItem.includes.map((item) => (
                  <li key={item}>
                    <span>+</span>
                    {item}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => openBooking(passItem.id)}>
                ВЫБРАТЬ ПРОПУСК <span>↗</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="steps-section">
        <div className="steps-heading" data-reveal>
          <span>04 / FIRST VISIT</span>
          <h2>ТРИ ШАГА ДО ТИШИНЫ</h2>
        </div>
        <div className="steps-grid">
          {steps.map(([number, title, text], index) => (
            <article
              data-reveal
              key={number}
              style={{ "--delay": `${index * 90}ms` } as CSSProperties}
            >
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <i>↘</i>
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <div data-scroll-line="forward" className="final-track" aria-hidden="true">
          NIGHTSHIFT · NIGHTSHIFT · NIGHTSHIFT
        </div>
        <div className="final-content" data-reveal>
          <span>READY WHEN YOU ARE</span>
          <h2>
            ТВОЯ ЛУЧШАЯ РАБОТА
            <br />
            МОЖЕТ СЛУЧИТЬСЯ НОЧЬЮ.
          </h2>
          <button type="button" onClick={() => openBooking()}>
            ЗАБРОНИРОВАТЬ ПЕРВУЮ СМЕНУ <b>↗</b>
          </button>
        </div>
      </section>

      <footer>
        <a className="brand" href="#top">
          <span>N</span>
          NIGHTSHIFT
        </a>
        <p>МОСКВА · БАСМАННЫЙ РАЙОН · 6 МИНУТ ОТ М. КУРСКАЯ</p>
        <span>© 2026 / PRIVATE WORK CLUB</span>
      </footer>

      {modalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setModalOpen(false)}
        >
          <div
            className="booking-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Закрыть"
              onClick={() => setModalOpen(false)}
            >
              ×
            </button>
            {booked ? (
              <div className="booking-success">
                <span>REQUEST / SENT</span>
                <strong>ГОТОВО.</strong>
                <p>
                  Заявка на «{activePass.name}» принята. Мы напишем в Telegram и
                  подтвердим свободное место.
                </p>
                <button type="button" onClick={() => setModalOpen(false)}>
                  ВЕРНУТЬСЯ НА САЙТ
                </button>
              </div>
            ) : (
              <>
                <span className="modal-index">BOOKING / 01</span>
                <h2 id="booking-title">ЗАБРОНИРОВАТЬ НОЧЬ</h2>
                <p>
                  Оставь контакты — подтвердим место и отправим детали входа.
                </p>
                <form onSubmit={submitBooking}>
                  <label>
                    Пропуск
                    <select
                      value={selectedPass}
                      onChange={(event) => setSelectedPass(event.target.value)}
                    >
                      {passes.map((passItem) => (
                        <option value={passItem.id} key={passItem.id}>
                          {passItem.name} — {passItem.price}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Имя
                    <input
                      required
                      name="name"
                      placeholder="Как к тебе обращаться"
                    />
                  </label>
                  <label>
                    Telegram
                    <input required name="telegram" placeholder="@username" />
                  </label>
                  <label>
                    Дата визита
                    <input required name="date" type="date" />
                  </label>
                  <button type="submit">
                    ОТПРАВИТЬ ЗАЯВКУ <span>↗</span>
                  </button>
                </form>
                <small>
                  Нажимая кнопку, ты соглашаешься на обработку данных для связи
                  по заявке.
                </small>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
