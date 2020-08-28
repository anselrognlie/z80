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

export function parity(value) {
  let p = 0;
  for (let i = 0; i < 8; ++i) {
    p += value % 2;
    value = value >> 1;
  }

  return (p + 1) % 2;
}
