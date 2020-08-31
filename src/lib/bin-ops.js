export function toBit(value) {
  return value ? 1 : 0;
}

export function clamp16(value) {
  const max16 = 0x0ffff;
  const v = toBit(value > max16)
  return [value & max16, v];
}

export function clamp8(value) {
  const max8 = 0x0ff;
  const v = toBit(value > max8);
  return [value & max8, v];
}

export function clamp4(value) {
  const max4 = 0x0f;
  const v = toBit(value > max4);
  return [value & max4, v];
}

export function getLo(value) {
  const mask = 0x0ff;
  return value & mask;
}

export function getHi(value) {
  const mask = ~0x0ff;
  return (value & mask) >> 8;
}

export function splitHiLo(value) {
  const hi = getHi(value);
  const lo = getLo(value)
  return { hi, lo };
}

export function makeWord({ hi, lo }) {
  return ((0x0ff & hi) << 8) | (0x0ff & lo);
}

export function parity8(value) {
  let p = 0;
  for (let i = 0; i < 8; ++i) {
    p += value % 2;
    value = value >> 1;
  }

  return (p + 1) % 2;
}

export function parity16(value) {
  let p = 0;
  for (let i = 0; i < 16; ++i) {
    p += value % 2;
    value = value >> 1;
  }

  return (p + 1) % 2;
}

export function signed8(value) {
  return (0x080 & value) ? -(256 - value) : value;
}

export function adc8(dst, op, cIn) {
  const result = dst + op + cIn;
  const a = result & 0x0ff;
  const c = toBit(result & ~0x0ff);
  const s = toBit(a & 0x080);
  const z = toBit(a === 0);
  const n = 0;
  const half = (dst & 0x0f) + (op & 0x0f);
  const h = toBit(half & 0x010);
  const p = parity8(a);
  const seven = (dst & 0x07f) + (op & 0x07f);
  const cin = toBit(seven & 0x080);
  const v = toBit(cin !== c);

  return { a, s, z, h, p, v, n, c };
}

export function adc16(dst, op, cIn) {
  const result = dst + op + cIn;
  const a = result & 0x0ffff;
  const c = toBit(result & ~0x0ffff);
  const s = toBit(a & 0x08000);
  const z = toBit(a === 0);
  const n = 0;
  const half = (dst & 0x0fff) + (op & 0x0fff);
  const h = toBit(half & 0x01000);
  const p = parity16(a);
  const m1 = (dst & 0x07fff) + (op & 0x07fff);
  const cin = toBit(m1 & 0x08000);
  const v = toBit(cin !== c);

  return { a, s, z, h, p, v, n, c };
}

export function add8(dst, op) {
  return adc8(dst, op, 0);
}

export function add16(dst, op) {
  return adc16(dst, op, 0);
}

export function sub8(dst, op) {
  const result = dst - op;
  const a = result & 0x0ff;
  const c = toBit(dst < op);
  const s = toBit(a & 0x080);
  const z = toBit(a === 0);
  const n = 1;
  const h = toBit((dst & 0x0f) < (op & 0x0f));
  const p = parity8(a);
  const cout = toBit((dst & 0x07f) < (op & 0x07f));
  const v = toBit(c !== cout);

  return { a, s, z, h, p, v, n, c };
}

export function sub16(dst, op) {
  const result = dst - op;
  const a = result & 0x0ffff;
  const c = toBit(dst < op);
  const s = toBit(a & 0x08000);
  const z = toBit(a === 0);
  const n = 1;
  const h = toBit((dst & 0x0fff) < (op & 0x0fff));
  const p = parity16(a);
  const cout = toBit((dst & 0x07fff) < (op & 0x07fff));
  const v = toBit(c !== cout);

  return { a, s, z, h, p, v, n, c };
}
