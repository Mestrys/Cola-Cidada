// Física de interface: molas interrompíveis, projeção de inércia e rubber-banding.
// Parâmetros no estilo Apple: dampingRatio (1 = sem overshoot) e response (s até o alvo).

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Ponto de repouso de um gesto lançado (mesma função de desaceleração da rolagem).
export function project(velocity, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

// Resistência progressiva além do limite: segue cada vez menos o dedo, sem parar seco.
export function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

// Velocidade (px/s) a partir das últimas amostras de posição {v, t}.
// Usa a janela dos últimos 100 ms; se um quadro lento deixou só a última amostra nela,
// recorre à anterior em vez de devolver 0 (senão o arremesso seria lido como "parou").
export function velocityFrom(samples) {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  const first = samples.find((s) => s !== last && last.t - s.t <= 100) || samples[samples.length - 2];
  const dt = last.t - first.t;
  return dt > 0 ? ((last.v - first.v) / dt) * 1000 : 0;
}

// Mola amortecida integrada a cada quadro. Começa do valor atual e herda a velocidade do gesto;
// stop() a interrompe e devolve o valor apresentado, para o próximo gesto partir dali.
export function spring({ from, to, velocity = 0, dampingRatio = 1, response = 0.35, onUpdate, onComplete }) {
  const stiffness = (2 * Math.PI / response) ** 2;
  const damping = (4 * Math.PI * dampingRatio) / response;
  let x = from;
  let v = velocity;
  let last = performance.now();
  let raf = 0;
  let done = false;

  const step = (now) => {
    let dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    // subpassos fixos mantêm a integração estável em quadros longos
    while (dt > 0) {
      const h = Math.min(dt, 1 / 240);
      const a = -stiffness * (x - to) - damping * v;
      v += a * h;
      x += v * h;
      dt -= h;
    }
    if (Math.abs(x - to) < 0.5 && Math.abs(v) < 20) {
      x = to;
      onUpdate(x);
      done = true;
      onComplete?.();
      return;
    }
    onUpdate(x);
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);

  return {
    stop() {
      cancelAnimationFrame(raf);
      done = true;
      return { value: x, velocity: v };
    },
    get running() {
      return !done;
    },
  };
}
