import Registry from './address-registry';
import Z80Memory from './z80-memory';

class SimpleConsumer {
  constructor(size) {
    this.size = size;
  }
}

test('empty registry', () => {
  const reg = new Registry();
  expect(reg.length).toBe(0);
});

test('register address maps', () => {
  const a = new SimpleConsumer(0x4000);
  const b = new SimpleConsumer(0x4000);
  const reg = new Registry();
  reg.register(0x4000, b);
  reg.register(0, a);
  expect(reg.length).toBe(2);
});

test('find single address range', () => {
  const a = new SimpleConsumer(0x4000);
  const reg = new Registry();
  reg.register(0, a);
  const map = reg.findMap(0x2000);
  expect(map.consumer).toBe(a);
});

test('find multiple address ranges', () => {
  const a = new SimpleConsumer(0x4000);
  const b = new SimpleConsumer(0x4000);
  const reg = new Registry();
  reg.register(0x4000, b);
  reg.register(0, a);
  const a$ = reg.findMap(0x2000);
  const b$ = reg.findMap(0x4000);
  expect(a$.consumer).toBe(a);
  expect(b$.consumer).toBe(b);
});

test('bus memory single write/read', () => {
  const a = new Z80Memory(0x4000);
  const reg = new Registry();
  reg.register(0x4000, a);
  reg.writeOne(0x6000, 1);
  const byte = reg.readOne(0x6000);
  expect(byte).toBe(1);
});

test('bus memory multi write/read', () => {
  const a = new Z80Memory(0x4000);
  const reg = new Registry();
  reg.register(0x4000, a);
  const values = [1, 2, 3, 4];
  reg.writeMany(0x6000, values);
  const bytes = reg.readMany(0x6000, 4);
  bytes.forEach((el, i) => {
    expect(el).toBe(values[i]);
  });
});
